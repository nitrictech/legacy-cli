// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { google } from 'googleapis';
import { Task, Stack, mapObject, NitricServiceImage } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from "@pulumi/gcp";

import {
	NitricApiGcpApiGateway,
	NitricBucketCloudStorage,
	NitricEntrypointGoogleCloudLB,
	NitricGcpProject,
	NitricScheduleCloudScheduler,
	NitricServiceCloudRun,
	NitricSiteCloudStorage,
	NitricTopicPubsub,
} from '../../resources';

import fs from 'fs';
import path from 'path';
import { Output } from '@pulumi/pulumi';

export interface ProgramResult {
	entrypoints?: {
		entrypoint: Output<string>;
		url: Output<string>;
	}[];
}

export interface DeployResult {
	entrypoints?: {
		entrypoint: string;
		url: string;
	}[];
}

interface CommonOptions {
	gcpProject: string;
}

export const DEPLOY_TASK_KEY = 'Deploying Nitric Stack to GCP';

interface DeployOptions extends CommonOptions {
	stack: Stack;
	region: string;
}

/**
 * Deploy Nitric Stack to GCP Project
 */
export class Deploy extends Task<DeployResult> {
	private stack: Stack;
	private gcpProject: string;
	private region: string;

	constructor({ stack, gcpProject, region }: DeployOptions) {
		super(DEPLOY_TASK_KEY);
		this.stack = stack;
		this.gcpProject = gcpProject;
		this.region = region;
	}

	async do(): Promise<DeployResult> {
		const { stack, gcpProject, region } = this;
		const { buckets = {}, apis = {}, topics = {}, schedules = {}, entrypoints } = stack.asNitricStack();
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();
		// Use absolute path to log files, so it's easier for users to locate them if printed to the console.
		const logFile = path.resolve(await stack.getLoggingFile('deploy:gcp'));
		const errorFile = path.resolve(await stack.getLoggingFile('error:gcp'));
		let result = {} as DeployResult;

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: `${stack.getName()}-gcp`,
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					const deploymentResult: ProgramResult = {};

					// Now we can start deploying with Pulumi
					try {

						// Get the current google cloud project
						const project = await gcp.organizations.getProject({});

						// Setup project and permissions for nitric
						new NitricGcpProject('project', {
							project,
						});

						// deploy the buckets
						mapObject(buckets).map((bucket) => 
							new NitricBucketCloudStorage(bucket.name, { bucket })
						);

						// deploy the topics
						const deployedTopics = mapObject(topics).map((topic) => 
							new NitricTopicPubsub(topic.name, { topic })
						);
						// deploy the services
						const { token: imageDeploymentToken } = await authClient.getAccessToken();

						const deployedSites = stack.getSites().map((site) => 
							new NitricSiteCloudStorage(site.getName(), { site })
						);

						const deployedServices = stack.getServices().map((service) => {
							// Build and push the image
							const image = new NitricServiceImage(service.getName(), {
								imageName: pulumi.interpolate`gcr.io/${gcpProject}/${service.getImageTagName()}`,
								nitricProvider: 'gcp',
								server: 'https://gcr.io',
								username: 'oauth2accesstoken',
								password: imageDeploymentToken!,
								service,
							});
							return new NitricServiceCloudRun(service.getName(), {
								service,
								topics: deployedTopics,
								image,
								location: region,
							});
						});

						// deploy the schedules
						mapObject(schedules).map(
							(s) => new NitricScheduleCloudScheduler(s.name, { schedule: s, topics: deployedTopics }),
						);
						// deploy apis
						const deployedApis = await Promise.all(
							mapObject(apis).map(async ({ name, ...spec }) => {
								const convertedSpec = await NitricApiGcpApiGateway.convertNitricAPIv2(spec);
								return new NitricApiGcpApiGateway(name, { api: convertedSpec, services: deployedServices });
							}),
						);

						if (entrypoints) {
							deploymentResult.entrypoints = Object.entries(entrypoints).map(([name, entrypoint]) => {
								const deployedEntrypoint = new NitricEntrypointGoogleCloudLB(stack.getName(), {
									entrypoint,
									services: deployedServices,
									apis: deployedApis,
									sites: deployedSites,
									stackName: stack.getName(),
								});

								return {
									entrypoint: pulumi.output(name),
									url: deployedEntrypoint.url,
								};
							});
						}
					} catch (e) {
						pulumi.log.error(`An error occurred, see latest gcp:error log for details: ${errorFile}`);
						fs.appendFileSync(errorFile, e.stack || e.toString());
						throw e;
					}

					return deploymentResult;
				},
			});
			await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			await pulumiStack.setConfig('gcp:region', { value: region });
			const update = this.update.bind(this);
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({
				onOutput: (out: string) => {
					update(out);
					fs.appendFileSync(logFile, out.toString());
				},
			});

			result = Object.keys(upRes.outputs).reduce(
				(acc, k) => ({
					...acc,
					[k]: upRes.outputs[k].value,
				}),
				{},
			) as DeployResult;
		} catch (e) {
			fs.appendFileSync(errorFile, e.stack || e.toString());
			throw new Error(`An error occurred, see latest gcp:error log for details: ${errorFile}`);
		}

		return result;
	}
}

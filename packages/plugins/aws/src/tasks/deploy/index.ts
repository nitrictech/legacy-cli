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

import { Task, Stack, mapObject, NitricServiceImage, NitricImage } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';

import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { ecr } from '@pulumi/aws';
import fs from 'fs';
import path from 'path';
import {
	NitricSnsTopic,
	NitricScheduleEventBridge,
	NitricSiteS3,
	NitricServiceAWSLambda,
	NitricApiAwsApiGateway,
	NitricEntrypointCloudFront,
	NitricBucketS3,
	NitricCollectionDynamo,
} from '../../resources';

/**
 * Common Task Options
 */
interface CommonOptions {
	account: string;
	region: string;
}

/**
 * Deploy Task Options
 */
interface DeployOptions extends CommonOptions {
	stack: Stack;
}

export interface DeployResult {
	entrypoints?: {
		name: string;
		url: string;
		domains?: string[];
	}[];
	//dnsConfigs?: {
	//	[name: string]: {
	//		create: string;
	//		target: string;
	//		targetType: string;
	//	};
	//};
}

interface ProgramResult {
	entrypoints?: pulumi.Output<{
		name: string;
		url: string;
		domains?: string[];
	}>[];
	//dnsConfigs?: pulumi.Output<{
	//	[name: string]: {
	//		create: string;
	//		target: string;
	//		type: string;
	//	};
	//}>;
}

export const DEPLOY_TASK_KEY = 'Deploying Nitric Stack to AWS';

/**
 * Deploys the given Nitric Stack
 */
export class Deploy extends Task<DeployResult> {
	private stack: Stack;
	private region: string;

	constructor({ stack, region }: DeployOptions) {
		super(DEPLOY_TASK_KEY);
		this.stack = stack;
		this.region = region;
	}

	async do(): Promise<DeployResult> {
		const { stack, region } = this;
		const {
			topics = {},
			buckets = {},
			collections = {},
			schedules = {},
			apis = {},
			entrypoints,
		} = stack.asNitricStack();
		// Use absolute path to log files, so it's easier for users to locate them if printed to the console.
		const logFile = path.resolve(await stack.getLoggingFile('deploy-aws'));
		const errorFile = path.resolve(await stack.getLoggingFile('error-aws'));
		let result = {} as DeployResult;

		this.update('Defining functions');

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: `${stack.getName()}-aws`,
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					const result = {} as ProgramResult;

					// Now we can start deploying with Pulumi
					try {
						const authToken = await ecr.getAuthorizationToken();

						// Deploy Nitric Topics
						const deployedTopics = mapObject(topics).map(
							(t) =>
								new NitricSnsTopic(t.name, {
									topic: t,
								}),
						);
						// Deploy Storage Buckets
						mapObject(buckets).forEach(
							(bucket) =>
								new NitricBucketS3(bucket.name, {
									bucket,
								}),
						);
						// Deploy Document Collections
						mapObject(collections).forEach(
							(collection) =>
								new NitricCollectionDynamo(collection.name, {
									collection,
								}),
						);
						// Deploy Nitric Schedules
						mapObject(schedules).forEach(
							(schedule) =>
								new NitricScheduleEventBridge(schedule.name, {
									schedule,
									topics: deployedTopics,
								}),
						);
						// Deploy Nitric Sites
						const deployedSites = stack.getSites().map(
							(s) =>
								new NitricSiteS3(s.getName(), {
									site: s,
									acl: 'public-read',
									indexDocument: 'index.html',
								}),
						);
						// Deploy Nitric Services
						const deployedServices = stack.getServices().map((s) => {
							// create a new repository for each service...
							const repository = new ecr.Repository(s.getImageTagName());

							const image = new NitricServiceImage(s.getName(), {
								service: s,
								server: authToken.proxyEndpoint,
								username: authToken.userName,
								password: authToken.password,
								imageName: repository.repositoryUrl,
								sourceImageName: s.getImageTagName('aws'),
							});

							return new NitricServiceAWSLambda(s.getName(), {
								service: s,
								topics: deployedTopics,
								image: image,
							});
						});
						// Deploy Nitric APIs
						const deployedApis = mapObject(apis).map(
							(api) =>
								new NitricApiAwsApiGateway(api.name, {
									api,
									services: deployedServices,
								}),
						);
						// Deploy Nitric Entrypoints
						if (entrypoints) {
							const eps = Object.entries(entrypoints).map(([name, entrypoint]) => {
								return new NitricEntrypointCloudFront(name, {
									stackName: stack.getName(),
									entrypoint: entrypoint,
									services: deployedServices,
									apis: deployedApis,
									sites: deployedSites,
								});
							});

							//result.dnsConfigs = eps.reduce((acc, e) => {
							//	return {
							//		...acc,
							//		...e.validationOptions?.apply(vo => vo.reduce((a, o) => {
							//			return {
							//				...a,
							//				[o.domainName]: {
							//					create: o.resourceRecordName,
							//					target: o.resourceRecordValue,
							//					type: o.resourceRecordType,
							//				},
							//			};
							//		}, {} as any))
							//	};
							//}, {} as any);

							result.entrypoints = eps.map((ep) => {
								return ep.cloudfront.domainName.apply((domainName) => ({
									name: ep.name,
									url: `https://${domainName}`,
									domains: ep.domains,
								}));
							});
						}
					} catch (e) {
						pulumi.log.error(`An error occurred, see latest aws:error log for details: ${errorFile}`);
						fs.appendFileSync(errorFile, e.stack || e.toString());
						throw e;
					}

					return result;
				},
			});

			await pulumiStack.setConfig('aws:region', { value: region });
			const update = this.update.bind(this);
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({
				onOutput: (out: string) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});

			if (upRes.stderr) {
				fs.appendFileSync(errorFile, upRes.stderr);
			}

			if (upRes.summary && upRes.summary.resourceChanges) {
				const changes = Object.entries(upRes.summary.resourceChanges)
					.map((entry) => entry.join(': '))
					.join(', ');
				this.update(changes);
			}

			result = Object.keys(upRes.outputs).reduce(
				(acc, k) => ({
					...acc,
					[k]: upRes.outputs[k].value,
				}),
				{},
			) as DeployResult;
		} catch (e) {
			fs.appendFileSync(errorFile, e.stack || e.toString());
			throw new Error(`An error occurred, see latest aws:error log for details: ${errorFile}`);
		}

		return result;
	}
}

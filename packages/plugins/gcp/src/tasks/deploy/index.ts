// Copyright 2021, Nitric Pty Ltd.
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
import { Task, Stack } from '@nitric/cli-common';
import { createFunction } from './functions';
import { createTopic } from './topics';
import { createBucket } from './buckets';
import { createSchedule } from './schedule';
import { createApi } from './apis';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { createSite } from './site';
import { createEntrypoints } from './entrypoints';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';

interface CommonOptions {
	gcpProject: string;
}

interface DeployOptions extends CommonOptions {
	stack: Stack;
	region: string;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	private gcpProject: string;
	private region: string;

	constructor({ stack, gcpProject, region }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.gcpProject = gcpProject;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, gcpProject, region } = this;
		const { buckets = [], apis = [], topics = [], schedules = [], entrypoints } = stack.asNitricStack();
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();
		const logFile = await stack.getLoggingFile('deploy:gcp');
		const errorFile = await stack.getLoggingFile('error:gcp');

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'gcp',
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// deploy the buckets
						(buckets || []).map(createBucket);

						// Deploy the topics
						const deployedTopics = (topics || []).map(createTopic);
						// deploy the functions
						const { token: imageDeploymentToken } = await authClient.getAccessToken();

						const deployedSites = await Promise.all(stack.getSites().map(createSite));
						const stackFunctions = stack.getFunctions();

						const deployedFunctions = stackFunctions.map((f) =>
							createFunction(region, f, deployedTopics, imageDeploymentToken!, gcpProject),
						);
						// deploy the schedules
						(schedules || []).map((s) => createSchedule(s, deployedTopics));
						// deploy apis
						const deployedApis = await Promise.all((apis || []).map((a) => createApi(a, deployedFunctions)));

						if (entrypoints) {
							// Deployed Entrypoints
							createEntrypoints(stack.getName(), entrypoints, deployedSites, deployedApis, deployedFunctions);
						}
					} catch (e) {
						pulumi.log.error('An error occurred, see latest gcp:error log for details');
						fs.appendFileSync(errorFile, e);
					}
				},
			});
			await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			await pulumiStack.setConfig('gcp:region', { value: region });
			const update = this.update.bind(this);
			// deploy the stack, tailing the logs to console
			await pulumiStack.up({
				onOutput: (out: string) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});

			// console.log(upRes);
		} catch (e) {
			fs.appendFileSync(errorFile, e);
			throw new Error('An error occurred, see latest gcp:error log for details');
		}
	}
}

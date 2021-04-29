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

import { Task, Stack } from '@nitric/cli-common';
// import createSecurityGroup from './security-group';
// import createContainer from './container';
import { createLambdaFunction } from './lambda';
import { createSchedule } from './eb-rule';
import { createApi } from './api';
// import createLoadBalancer from './load-balancer';
import { createTopic } from './topic';
import * as pulumi from '@pulumi/pulumi';

import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { ecr } from '@pulumi/aws';
import { createSite } from './site';
import { createEntrypoints } from './entrypoint';
import fs from 'fs';

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
	// vpc: string;
	// cluster: string;
	// subnets: string[];
}

/**
 * Deploys the given Nitric Stack
 */
export class Deploy extends Task<void> {
	private stack: Stack;
	private region: string;
	// private vpc: string;
	// private cluster: string;
	// private subnets: string[];

	constructor({ stack, region }: DeployOptions) {
		super('Deploying Nitric Stack');
		this.stack = stack;
		this.region = region;
		// TODO: Just generate the dang VPC and get rid of these three things.
		// this.vpc = vpc;
		// this.cluster = cluster;
		// this.subnets = subnets;
	}

	async do(): Promise<void> {
		const { stack, region } = this;
		const { topics = [], schedules = [], apis = [], entrypoints } = stack.asNitricStack();
		const logFile = await stack.getLoggingFile('deploy:aws');
		const errorFile = await stack.getLoggingFile('error:aws');

		this.update('Defining functions');

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'aws',
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						const authToken = await ecr.getAuthorizationToken();
						// Create topics
						// There are a few dependencies on this
						const deployedTopics = (topics || []).map(createTopic);

						// Deploy schedules
						(schedules || []).forEach((schedule) => createSchedule(schedule, deployedTopics));

						const deployedSites = await Promise.all(stack.getSites().map(createSite));

						const deployedFunctions = stack
							.getFunctions()
							.map((func) => createLambdaFunction(func, deployedTopics, authToken));

						// Deploy APIs
						const deployedApis = (apis || []).map((api) => createApi(api, deployedFunctions));

						if (entrypoints) {
							createEntrypoints(stack.getName(), entrypoints, deployedSites, deployedApis, deployedFunctions);
						}
					} catch (e) {
						fs.appendFileSync(errorFile, e);
						pulumi.log.error('There we an error deploying the stack please check error logs for more detail');
					}
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

			if (upRes.summary && upRes.summary.resourceChanges) {
				const changes = Object.entries(upRes.summary.resourceChanges)
					.map((entry) => entry.join(': '))
					.join(', ');
				this.update(changes);
			}
		} catch (e) {
			fs.appendFileSync(errorFile, e);
			throw new Error('An error occurred during deployment, please see latest aws:error log for more details');
			// console.log(e);
		}
	}
}

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

import { Stack, Task, mapObject } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { resources, storage, web, containerregistry } from '@pulumi/azure-native';
import { createBucket } from './bucket';
import { createTopic } from './topic';
import { createFunctionAsApp } from './function';
import { createQueue } from './queue';
import { createAPI } from './api';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';
import path from 'path';

interface DeployOptions {
	stack: Stack;
	region: string;
	orgName: string;
	adminEmail: string;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	private orgName: string;
	private adminEmail: string;
	private region: string;

	constructor({ stack, orgName, adminEmail, region }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.orgName = orgName;
		this.adminEmail = adminEmail;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, orgName, adminEmail, region } = this;
		const { buckets, apis = {}, topics = {}, schedules = {}, queues } = stack.asNitricStack();

		// Use absolute path to log files, so it's easier for users to locate them if printed to the console.
		const errorFile = path.resolve(await stack.getLoggingFile('error-azure'));
		const logFile = path.resolve(await stack.getLoggingFile('deploy-azure'));

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: `${stack.getName()}-azure`,
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// Create a new resource group for the nitric stack
						// This'll be used for basically everything we deploy in this stack
						const resourceGroup = new resources.ResourceGroup(stack.getName(), {
							resourceGroupName: stack.getName(),
							location: region,
						});

						const registry = new containerregistry.Registry(`${stack.getName()}-registry`, {
							resourceGroupName: resourceGroup.name,
							location: resourceGroup.location,
							registryName: `${stack.getName().replace(/-/g, '')}Registry`,
							adminUserEnabled: true,
							sku: {
								name: 'Basic',
							},
						});

						// Deploy
						const appServicePlan = new web.AppServicePlan(`${stack.getName()}Plan`, {
							name: `${stack.getName()}Plan`,
							location: resourceGroup.location,
							resourceGroupName: resourceGroup.name,
							kind: 'Linux',
							reserved: true,
							sku: {
								// for development only
								// Will upgrade tiers/elasticity for different stack tiers e.g. dev/test/prod (prefab recipes)
								//name: 'B1',
								//tier: 'Basic',
								//size: 'B1',
								name: 'F1',
								tier: 'Free',
								size: 'F1',
							},
						});

						// Create a new storage account for this stack
						if (buckets || queues) {
							const account = new storage.StorageAccount(`${stack.getName()}-storage-account`, {
								resourceGroupName: resourceGroup.name,
								// 24 character limit
								accountName: `${stack.getName().replace(/-/g, '')}`,
								kind: 'Storage',
								sku: {
									name: 'Standard_LRS',
								},
							});

							// Not using refeschedulerrences produced currently,
							// but leaving as map in case we need to reference in future
							mapObject(buckets || {}).map((b) => createBucket(resourceGroup, account, b));
							mapObject(queues || {}).map((q) => createQueue(resourceGroup, account, q));
						}

						const deployedTopics = mapObject(topics).map((t) => createTopic(resourceGroup, t));

						// Deploy functions here...
						// need to determine our deployment method for them
						const DeployedServices = stack
							.getServices()
							.map((f) => createFunctionAsApp(resourceGroup, registry, appServicePlan, f, deployedTopics));

						// TODO: Add schedule support
						// NOTE: Currently CRONTAB support is required, we either need to revisit the design of
						// our scheduled expressions or implement a workaround for request a feature.
						if (schedules) {
							pulumi.log.warn('Schedules are not currently supported for Azure deployments');
							// schedules.map(s => createSchedule(resourceGroup, s))
						}

						mapObject(apis).map((a) => createAPI(resourceGroup, orgName, adminEmail, a, DeployedServices));
					} catch (e) {
						pulumi.log.error(`An error occurred, see latest azure:error log for details: ${errorFile}`);
						fs.appendFileSync(errorFile, e.stack || e.toString());
						throw e;
					}
				},
			});
			await pulumiStack.setConfig('azure-native:location', { value: region });

			// deploy the stack, log to console
			const update = this.update.bind(this);
			const upRes = await pulumiStack.up({
				onOutput: (out) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});
			console.log(upRes);
		} catch (e) {
			fs.appendFileSync(errorFile, e.stack || e.toString());
			throw new Error(`An error occurred, see latest do:error log for details: ${errorFile}`);
		}
	}
}

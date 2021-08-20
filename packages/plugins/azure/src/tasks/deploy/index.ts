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

import { Stack, Task, mapObject, NitricServiceImage } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { resources, storage, web, containerregistry } from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';
import path from 'path';
import {
	NitricServiceAzureAppService,
	NitricEventgridTopic,
	NitricAzureStorageBucket,
	NitricStorageQueue,
	NitricAzureStorageSite,
	NitricApiAzureApiManagement,
	NitricEntrypointAzureFrontDoor,
} from '../../resources';

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
		const {
			buckets = {},
			apis = {},
			topics = {},
			schedules = {},
			queues = {},
			entrypoints = {},
		} = stack.asNitricStack();

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

						// Create a new storage account for this stack
						// DEPLOY STORAGE BASED ASSETS
						let deployedSites: NitricAzureStorageSite[] = [];
						if (Object.keys(buckets).length || Object.keys(queues).length || stack.getSites().length) {
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
							mapObject(buckets || {}).map(
								(b) =>
									new NitricAzureStorageBucket(b.name, {
										resourceGroup,
										bucket: b,
										storageAcct: account,
									}),
							);
							mapObject(queues || {}).map(
								(q) =>
									new NitricStorageQueue(q.name, {
										queue: q,
										storageAcct: account,
										resourceGroup,
									}),
							);
							deployedSites = stack.getSites().map(
								(s) =>
									new NitricAzureStorageSite(s.getName(), {
										site: s,
										storageAcct: account,
										resourceGroup,
									}),
							);
						}

						// DEPLOY TOPICS
						const deployedTopics = mapObject(topics).map(
							(t) =>
								new NitricEventgridTopic(t.name, {
									resourceGroup,
									topic: t,
								}),
						);

						// DEPLOY SERVICES
						let deployedServices: NitricServiceAzureAppService[] = [];
						if (stack.getServices().length > 0) {
							// deploy a registry for deploying this stacks containers
							// TODO: We will want to prefer a pre-existing registry, supplied by the user
							const registry = new containerregistry.Registry(`${stack.getName()}-registry`, {
								resourceGroupName: resourceGroup.name,
								location: resourceGroup.location,
								registryName: `${stack.getName().replace(/-/g, '')}Registry`,
								adminUserEnabled: true,
								sku: {
									name: 'Basic',
								},
							});

							// Deploy create an app service plan for this stack
							const plan = new web.AppServicePlan(`${stack.getName()}Plan`, {
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

							// get registry credentials
							const credentials = pulumi
								.all([resourceGroup.name, registry.name])
								.apply(([resourceGroupName, registryName]) =>
									containerregistry.listRegistryCredentials({
										resourceGroupName: resourceGroupName,
										registryName: registryName,
									}),
								);
							const adminUsername = credentials.apply((credentials) => credentials.username!);
							const adminPassword = credentials.apply((credentials) => credentials.passwords![0].value!);

							deployedServices = stack.getServices().map((s) => {
								// Deploy the services image
								const image = new NitricServiceImage(`${s.getName()}-image`, {
									service: s,
									imageName: pulumi.interpolate`${registry.loginServer}/${s.getImageTagName('azure')}`,
									sourceImageName: s.getImageTagName('azure'),
									username: adminUsername,
									password: adminPassword,
									server: registry.loginServer,
								});

								// Create a new Nitric azure app service instance
								return new NitricServiceAzureAppService(s.getName(), {
									resourceGroup,
									plan,
									registry,
									service: s,
									topics: deployedTopics,
									image,
								});
							});
						}

						// TODO: Add schedule support
						// NOTE: Currently CRONTAB support is required, we either need to revisit the design of
						// our scheduled expressions or implement a workaround for request a feature.
						if (schedules) {
							pulumi.log.warn('Schedules are not currently supported for Azure deployments');
							// schedules.map(s => createSchedule(resourceGroup, s))
						}

						const deployedApis = mapObject(apis).map(
							(a) =>
								new NitricApiAzureApiManagement(a.name, {
									resourceGroup,
									orgName,
									adminEmail,
									api: a,
									services: deployedServices,
								}),
						);

						// FIXME: Implement front door deployment logic,
						// class is currently just a placeholder
						mapObject(entrypoints).map(
							(e) =>
								new NitricEntrypointAzureFrontDoor(e.name, {
									resourceGroup,
									entrypoint: e,
									services: deployedServices,
									sites: deployedSites,
									apis: deployedApis,
								}),
						);
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

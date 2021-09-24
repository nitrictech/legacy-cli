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

import { Stack, Task, mapObject, NitricContainerImage } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import {
	authorization,
	resources,
	storage,
	web,
	containerregistry,
	keyvault,
	eventgrid,
	documentdb,
} from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';
import path from 'path';
import {
	NitricComputeAzureAppService,
	NitricEventgridTopic,
	NitricAzureStorageBucket,
	NitricStorageQueue,
	NitricAzureStorageSite,
	NitricApiAzureApiManagement,
	NitricEntrypointAzureFrontDoor,
	NitricCollectionCosmosMongo,
	NitricDatabaseCosmosMongo,
	NitricDatabaseAccountMongoDB,
	NitricComputeAzureAppServiceEnvVariable,
} from '../../resources';
import { AppServicePlan } from '../../types';
import axios from 'axios';

interface DeployOptions {
	stack: Stack;
	region: string;
	orgName: string;
	adminEmail: string;
	servicePlan: AppServicePlan;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	private orgName: string;
	private adminEmail: string;
	private region: string;
	private servicePlan: AppServicePlan;

	constructor({ stack, orgName, adminEmail, region, servicePlan }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.orgName = orgName;
		this.adminEmail = adminEmail;
		this.region = region;
		this.servicePlan = servicePlan;
	}

	async do(): Promise<void> {
		const { stack, orgName, adminEmail, region } = this;
		const {
			buckets = {},
			collections = {},
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
						const clientConfig = await authorization.getClientConfig();

						// Create a new resource group for the nitric stack
						// This'll be used for basically everything we deploy in this stack
						const resourceGroup = new resources.ResourceGroup(stack.getName(), {
							resourceGroupName: stack.getName(),
							location: region,
						});

						// Create a stack level keyvault if secrets are enabled
						// At the moment secrets have no config level setting
						const kvault = new keyvault.Vault(`${stack.getName()}`.substring(0, 13), {
							resourceGroupName: resourceGroup.name,
							properties: {
								enableSoftDelete: false,
								enableRbacAuthorization: true,
								sku: {
									family: 'A',
									name: 'standard',
								},
								tenantId: clientConfig.tenantId,
							},
						});

						// Universal app service environment variables
						let appServiceEnv: NitricComputeAzureAppServiceEnvVariable[] = [
							{
								name: 'KVAULT_NAME',
								value: kvault.name,
							},
						];

						// Create a new storage account for this stack
						// DEPLOY STORAGE BASED ASSETS
						let deployedSites: NitricAzureStorageSite[] = [];
						if (Object.keys(buckets).length || Object.keys(queues).length || stack.getSites().length) {
							const account = new storage.StorageAccount(`${stack.getName()}`.replace(/-/g, '').substring(0, 13), {
								resourceGroupName: resourceGroup.name,
								kind: storage.Kind.StorageV2,
								sku: {
									name: storage.SkuName.Standard_LRS,
								},
							});

							// Ensure deployed app services are pointed to
							// the created storage account endpoints
							appServiceEnv = [
								...appServiceEnv,
								{
									name: 'AZURE_STORAGE_ACCOUNT_BLOB_ENDPOINT',
									value: account.primaryEndpoints.blob,
								},
								{
									name: 'AZURE_STORAGE_ACCOUNT_QUEUE_ENDPOINT',
									value: account.primaryEndpoints.queue,
								},
							];

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

						if (Object.keys(collections).length) {
							// CREATE DB ACCOUNT
							const { account } = new NitricDatabaseAccountMongoDB(
								`${stack.getName()}`.replace(/-/g, '').substring(0, 13),
								{
									resourceGroup,
								},
							);

							// CREATE DB
							const { database } = new NitricDatabaseCosmosMongo(stack.getName(), {
								account,
								resourceGroup,
							});

							// get connection string
							const connectionStrings = pulumi
								.all([resourceGroup.name, account.name])
								.apply(([resourceGroupName, accountName]) =>
									documentdb.listDatabaseAccountConnectionStrings({ resourceGroupName, accountName }),
								);

							const connectionString = connectionStrings.apply((cs) => cs.connectionStrings![0].connectionString);

							if (!connectionString) {
								throw new Error('No connection strings found for azure database');
							}

							// TODO: Add connection string to app service instance
							appServiceEnv = [
								...appServiceEnv,
								// Add the DB connection string and database name for the stack shared database
								{
									name: 'MONGODB_CONNECTION_STRING',
									value: connectionString,
								},
								{
									name: 'MONGODB_DATABASE',
									value: database.name,
								},
							];

							// DEPLOY COLLECTIONS
							mapObject(collections).map(
								(coll) =>
									new NitricCollectionCosmosMongo(coll.name, {
										collection: coll,
										account,
										database,
										resourceGroup,
									}),
							);
						}

						// DEPLOY SERVICES
						let deployedAzureApps: NitricComputeAzureAppService[] = [];
						if (stack.getFunctions().length > 0) {
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

							// Deploy create an app func plan for this stack
							const plan = new web.AppServicePlan(`${stack.getName()}Plan`, {
								name: `${stack.getName()}Plan`,
								location: resourceGroup.location,
								resourceGroupName: resourceGroup.name,
								kind: 'Linux',
								reserved: true,
								sku: {
									name: this.servicePlan.size,
									tier: this.servicePlan.tier,
									size: this.servicePlan.size,
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

							deployedAzureApps = [
								...stack.getFunctions().map((func) => {
									// Deploy the lambdas image
									const image = new NitricContainerImage(`${func.getName()}-image`, {
										unit: func,
										imageName: pulumi.interpolate`${registry.loginServer}/${func.getImageTagName('azure')}`,
										sourceImageName: func.getImageTagName('azure'),
										username: adminUsername,
										password: adminPassword,
										server: registry.loginServer,
									});

									// Create a new Nitric azure app func instance
									return new NitricComputeAzureAppService(func.getName(), {
										source: func,
										subscriptionId: clientConfig.subscriptionId,
										resourceGroup,
										plan,
										registry,
										topics: deployedTopics,
										image,
										env: appServiceEnv,
									});
								}),
								...stack.getContainers().map((container) => {
									// Deploy the lambdas image
									const image = new NitricContainerImage(`${container.getName()}-image`, {
										unit: container,
										imageName: pulumi.interpolate`${registry.loginServer}/${container.getImageTagName('azure')}`,
										sourceImageName: container.getImageTagName('azure'),
										username: adminUsername,
										password: adminPassword,
										server: registry.loginServer,
									});

									// Create a new Nitric azure app func instance
									return new NitricComputeAzureAppService(container.getName(), {
										source: container,
										subscriptionId: clientConfig.subscriptionId,
										resourceGroup,
										plan,
										registry,
										topics: deployedTopics,
										image,
										env: appServiceEnv,
									});
								}),
							];
						}

						const maxWaitTime = 300000; // 5 minutes.

						// Setup subscriptions
						await Promise.all(
							deployedAzureApps
								.filter((deployed) => deployed.subscriptions.length)
								.map(async (deployed) => {
									pulumi.log.info(`waiting for ${deployed.name} to start before creating subscriptions`);
									// Get the full URL of the deployed container
									const hostname = await new Promise((res) => deployed.webapp.defaultHostName.apply(res));
									const hostUrl = `https://${hostname}`;

									// Poll the URL until the host has started.
									const start = Date.now();
									while (Date.now() - start <= maxWaitTime) {
										pulumi.log.info(`attempting to contact container ${deployed.name} via ${hostUrl}`);
										try {
											// TODO: Implement a membrane health check handler in the Membrane and trigger that instead.
											// Set event type header to simulate a subscription validation event.
											// These events are automatically resolved by the Membrane and won't be processed by handlers.
											const config = {
												headers: {
													'aeg-event-type': 'SubscriptionValidation',
												},
											};
											// Provide data in the expected shape. The content is current not important.
											const data = [
												{
													id: '',
													topic: '',
													subject: '',
													eventType: '',
													metadataVersion: '',
													dataVersion: '',
													data: {
														validationCode: '',
														validationUrl: '',
													},
												},
											];
											const resp = await axios.post(hostUrl, JSON.stringify(data), config);
											pulumi.log.info(
												`container ${deployed.name} is now available with status ${resp.status}, setting up subscription`,
											);
											break;
										} catch (err) {
											console.log(err);
											pulumi.log.info('failed to contact container');
										}
									}
									pulumi.log.info(`creating subscriptions for ${deployed.name}`);

									return deployed.subscriptions.map(
										(sub) =>
											new eventgrid.EventSubscription(`${deployed.name}-${sub.name}-subscription`, {
												eventSubscriptionName: `${deployed.name}-${sub.name}-subscription`,
												scope: sub.eventGridTopic.id,
												destination: {
													endpointType: 'WebHook',
													endpointUrl: hostUrl,
													// TODO: Reduce event chattiness here and handle internally in the Azure AppService HTTP Gateway?
													maxEventsPerBatch: 1,
												},
												retryPolicy: {
													maxDeliveryAttempts: 30,
													eventTimeToLiveInMinutes: 5,
												},
											}),
									);
								}),
						);

						// TODO: Add schedule support
						// NOTE: Currently CRONTAB support is required, we either need to revisit the design of
						// our scheduled expressions or implement a workaround or request a feature.
						if (Object.keys(schedules).length) {
							pulumi.log.warn('Schedules are not currently supported for Azure deployments');
							// schedules.map(s => createSchedule(resourceGroup, s))
						}

						const deployedApis = stack.getApis().map(
							(a) =>
								new NitricApiAzureApiManagement(a.name, {
									resourceGroup,
									orgName,
									adminEmail,
									api: a,
									services: deployedAzureApps,
								}),
						);

						// FIXME: Implement Front Door deployment logic,
						// class is currently just a placeholder
						mapObject(entrypoints).map(
							(e) =>
								new NitricEntrypointAzureFrontDoor(e.name, {
									stackName: stack.getName(),
									subscriptionId: clientConfig.subscriptionId,
									resourceGroup,
									entrypoint: e,
									services: deployedAzureApps,
									sites: deployedSites,
									apis: deployedApis,
								}),
						);
					} catch (err) {
						pulumi.log.error(`An error occurred, see latest azure:error log for details: ${errorFile}`);
						fs.appendFileSync(errorFile, (err as Error).stack || (err as Error).toString());
						throw err;
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
		} catch (err) {
			fs.appendFileSync(errorFile, (err as Error).stack || (err as Error).toString());
			throw new Error(`An error occurred, see latest azure:error log for details: ${errorFile}`);
		}
	}
}

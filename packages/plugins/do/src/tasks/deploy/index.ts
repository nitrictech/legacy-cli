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

import { Task, Stack, mapObject, NitricServiceImage } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import * as digitalocean from '@pulumi/digitalocean';
import { createServiceSpec } from './function';
import fs from 'fs';

const REGISTRY_LIMITS: Record<string, number> = {
	starter: 1,
	basic: 5,
	professional: Infinity,
};

interface DeployOptions {
	stack: Stack;
	region: string;
	// Currently each digital ocean account
	// may only have one docker container registry
	registryName: string;
	token: string;
}

export interface DeployResults {
	// The name in this case will be the name of the deployed DO App
	[name: string]: {
		liveUrl?: string;
		defaultIngress?: string;
		requiresConfig?: boolean;
	};
}

export const DEPLOY_TASK_KEY = 'Deploying to Digital Ocean';

export class Deploy extends Task<DeployResults> {
	private stack: Stack;
	private region: string;
	private registryName: string;
	private token: string;

	constructor({ stack, region, registryName, token }: DeployOptions) {
		super(DEPLOY_TASK_KEY);
		this.stack = stack;
		this.region = region;
		this.registryName = registryName;
		this.token = token;
	}

	async do(): Promise<DeployResults> {
		const { stack, region, registryName, token } = this;
		const {
			buckets = {},
			apis = {},
			topics = {},
			schedules = {},
			sites = {},
			queues = {},
			entrypoints = {},
		} = stack.asNitricStack();
		const errorFile = await stack.getLoggingFile('error:do');
		const logFile = await stack.getLoggingFile('deploy:do');

		try {
			// Upload the stack
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'do',
				projectName: `${stack.getName()}-do`,
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// Create a new storage account for this stack
						if (mapObject(buckets || {}).length > 0) {
							pulumi.log.warn('Buckets currently not supported for digital ocean deployments');
						}

						if (mapObject(apis || {}).length > 0) {
							pulumi.log.warn('APIs currently not supported for digital ocean deployments');
						}

						if (mapObject(topics || {}).length > 0) {
							pulumi.log.warn('Topics currently not supported for digital ocean deployments');
						}

						if (mapObject(schedules || {}).length > 0) {
							pulumi.log.warn('Schedules currently not supported for digital ocean deployments');
						}

						if (mapObject(queues || {}).length > 0) {
							pulumi.log.warn('Queues currently not supported for digital ocean deployments');
						}

						if (mapObject(sites || {}).length > 0) {
							pulumi.log.warn('Static sites currently not supported for digital ocean deployments');
						}

						if (Object.keys(entrypoints || {}).length < 0) {
							throw new Error('Digital ocean stacks MUST specify at least one entrypoint!');
						}

						const services = stack.getServices();

						if (services.length > 0) {
							const containerRegistry = await digitalocean.getContainerRegistry({
								name: registryName,
							});

							// TODO: This currently assumes that the registry is empty
							if (services.length > REGISTRY_LIMITS[containerRegistry.subscriptionTierSlug]) {
								pulumi.log.error(
									'Provided registry cannot support the number of functions in this stack, look at upgrading your DOCR subscription tier',
								);
							}

							const serviceImages = services.map((service) => {
								return {
									serviceName: service.getName(),
									image: new NitricServiceImage(service.getName(), {
										service,
										username: token,
										password: token,
										imageName: pulumi.interpolate`registry.digitalocean.com/${registryName}/${service.getName()}`,
										server: 'registry.digitalocean.com',
										nitricProvider: 'do',
									}),
								};
							});

							if (Object.keys(entrypoints || {}).length > 1) {
								pulumi.log.warn('Multiple entrypoints will result in multiple digital ocean apps being created!');
							}

							// Deploy a Digital Ocean "App" for each entrypoint, add the targets as containers.
							const deployResults = Object.entries(entrypoints).map(([name, entrypoint]) => {
								const normalizedPaths = Object.entries(entrypoint.paths).map(([path, opts]) => ({
									path,
									...opts,
								}));

								if (normalizedPaths.length < 1) {
									throw new Error(`Entrypoint [${name}] contains no paths`);
								}

								if (!normalizedPaths.find(({ path }) => path === '/')) {
									throw new Error(`Entrypoint [${name}] must contain a default path /`);
								}

								const servicePaths = normalizedPaths.filter(({ type }) => type === 'service');
								const otherPaths = normalizedPaths.filter(({ type }) => type !== 'service');

								if (otherPaths.length > 0) {
									pulumi.log.warn(
										`Entrypoint [${name}] contains non-service paths [${otherPaths
											.map(({ path }) => path)
											.join(', ')}], which are not supported for digital ocean deployments`,
									);
								}

								// Create the functions
								const results = serviceImages
									.filter(({ serviceName }) => {
										return servicePaths.find(({ target }) => target == serviceName) != undefined;
									})
									.map(({ serviceName, image }) => createServiceSpec(serviceName, image, entrypoint));

								const app = new digitalocean.App(stack.getName(), {
									spec: {
										name: `${stack.getName()}-${name}`,
										region: region,
										services: results.map((r) => r.spec),
										domainNames: (entrypoint.domains || []).map((name) => ({ name })),
									},
								});

								const requiresConfig = pulumi
									.all([app.liveUrl, app.defaultIngress])
									.apply(([liveUrl, defaultIngress]) => liveUrl !== defaultIngress);

								return {
									[name]: {
										liveUrl: app.liveUrl,
										// notify users of required updates if a set of domains is provided...
										defaultIngress: app.defaultIngress,
										requiresConfig,
									},
								};
							});

							return deployResults.reduce((acc, res) => ({ ...acc, ...res }), {});
						}
					} catch (e) {
						fs.appendFileSync(errorFile, e.stack);
						throw e;
					}

					return {};
				},
			});

			// deploy the stack, log to console
			const update = this.update.bind(this);
			const upRes = await pulumiStack.up({
				onOutput: (out) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});

			return Object.entries(upRes.outputs).reduce(
				(acc, [key, val]) => ({
					...acc,
					[key]: val.value,
				}),
				{},
			);
		} catch (e) {
			fs.appendFileSync(errorFile, e.stack);
			throw 'An error ocurred during deployment see latest do:error logs';
		}
	}
}

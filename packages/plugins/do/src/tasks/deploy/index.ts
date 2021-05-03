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

import { Task, Stack } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import * as digitalocean from '@pulumi/digitalocean';
import { createFunction } from './function';
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
	//orgName: string;
	//adminEmail: string;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	private region: string;
	private registryName: string;
	private token: string;

	constructor({ stack, region, registryName, token }: DeployOptions) {
		super('Deploying to Digital Ocean');
		this.stack = stack;
		this.region = region;
		this.registryName = registryName;
		this.token = token;
	}

	async do(): Promise<void> {
		const { stack, region, registryName, token } = this;
		const {
			buckets = [],
			apis = [],
			topics = [],
			schedules = [],
			queues = [],
			entrypoints = {},
		} = stack.asNitricStack();

		try {
			// Upload the stack
			const logFile = await stack.getLoggingFile('deploy:do');
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'do',
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// Create a new storage account for this stack
						if (buckets.length > 0) {
							pulumi.log.warn('Buckets currently not supported for digital ocean deployments');
						}

						if (apis.length > 0) {
							pulumi.log.warn('APIs currently not supported for digital ocean deployments');
						}

						if (topics.length > 0) {
							pulumi.log.warn('Topics currently not supported for digital ocean deployments');
						}

						if (schedules.length > 0) {
							pulumi.log.warn('Schedules currently not supported for digital ocean deployments');
						}

						if (queues.length > 0) {
							pulumi.log.warn('Queues currently not supported for digital ocean deployments');
						}

						const funcs = stack.getFunctions();

						if (funcs.length > 0) {
							const containerRegistry = await digitalocean.getContainerRegistry({
								name: registryName,
							});

							const normalizedEntrypoints = Object.keys(entrypoints).map((ep) => ({
								path: ep,
								...entrypoints[ep],
							}));

							if (normalizedEntrypoints.length < 1) {
								throw new Error('Entrypoints must be defined for digital ocean deployments');
							}

							if (!normalizedEntrypoints.find(({ path }) => path === '/')) {
								throw new Error('Entrypoints must contain a default route /');
							}

							const functionEntrypoints = normalizedEntrypoints.filter(({ type }) => type === 'function');
							const otherEntrypoints = normalizedEntrypoints.filter(({ type }) => type !== 'function');

							if (otherEntrypoints.length > 0) {
								pulumi.log.warn('Non function entrypoints are not supported for digital ocean deployments');
							}

							// This currently assumes that the registry is empty
							if (funcs.length > REGISTRY_LIMITS[containerRegistry.subscriptionTierSlug]) {
								pulumi.log.error(
									'Provided registry cannot support the number of functions in this stack, look at upgrading your DOCR subscription tier',
								);
							}

							// Create the functions
							const functionSpecs = stack
								.getFunctions()
								.map((f) => createFunction(f, registryName, token, functionEntrypoints));
							const app = new digitalocean.App(stack.getName(), {
								spec: {
									name: stack.getName(),
									// TODO: Configure region
									region: region,
									services: functionSpecs,
								},
							});

							return {
								liveUrl: app.liveUrl,
							};
						}
					} catch (e) {
						console.error(e);
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
			console.log(upRes.outputs);
		} catch (e) {
			console.log(e);
		}
	}
}

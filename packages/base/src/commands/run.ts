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

import cli from 'cli-ux';
import Build, { createBuildTasks } from './build';
import { BaseCommand, Stack, wrapTaskForListr, NitricImage, NitricStack } from '@nitric/cli-common';
import { Listr, ListrTask, ListrContext, ListrRenderer } from 'listr2';
import path from 'path';
import execa from 'execa';
import Docker, { Container, Network, Volume } from 'dockerode';
import getPort from 'get-port';
import readline from 'readline';

import {
	CreateNetworkTask,
	CreateVolumeTask,
	RunEntrypointTask,
	RunEntrypointTaskOptions,
	RunGatewayTask,
	RunGatewayTaskOptions,
	RunServiceTask,
	RunServiceTaskOptions,
} from '../tasks';
import { TaskWrapper } from 'listr2/dist/lib/task-wrapper';
import crypto from 'crypto';

interface KnownListrCtx {
	network: Network;
	volume: Volume;
}

type ListrCtx = { [key: string]: any } & KnownListrCtx & ListrContext;

// Lowest available ephemeral port
export const MIN_PORT = 49152; // start of ephemeral port range, as defined by IANA

// Highest available ephemeral port
export const MAX_PORT = 65535; // end of ephemeral port range, as defined by IANA

/**
 * Creates a list of local container endpoints, which are used by locally running
 * containers to push messages directly to their subscribers.
 *
 * Used to simulate pub/sub connections for local testing only.
 *
 * @param stack used to generate the full subscriber list for every topic.
 */
export function getContainerSubscriptions({
	topics = {},
	services = {},
}: NitricStack): Record<string, string[]> | undefined {
	const namedTopics = Object.keys(topics).map((name) => ({ name, ...topics[name] }));
	const namedServices = Object.keys(services).map((name) => ({ name, ...services[name] }));

	// Find and return the subscribed services for each topic
	return namedTopics.reduce((subs, topic) => {
		return {
			...subs,
			[topic.name]: namedServices
				.filter(({ triggers }) => {
					return triggers && (triggers.topics || []).filter((name) => name === topic.name).length > 0;
				})
				.map((service) => `http://${service.name}:9001`),
		};
	}, {} as Record<string, string[]>);
}

/**
 * Returns an Iterable<number> port range between the provided min and max ports (inclusive)
 * @param minPort the first port in the range (inclusive), must be greater or equal to 1024
 * @param maxPort the last port in the range (inclusive), must be less or equal to 65535
 */
export function getPortRange(minPort: number = MIN_PORT, maxPort: number = MAX_PORT): Iterable<number> {
	if (maxPort <= minPort) {
		throw new Error('maxPort must be greater than minPort');
	}

	return getPort.makeRange(minPort, maxPort);
}

/**
 * Returns an array of Listr wrapped RunServiceTasks
 * @param services to run
 * @param docker handle to use when running the services
 * @param network docker network to use with the service containers
 * @param volume docker volume to mount in the service containers
 */
export function createServiceTasks(
	services: RunServiceTaskOptions[],
	docker: Docker,
	network: Docker.Network,
	volume: Docker.Volume,
): Array<ListrTask> {
	return services.map((service) =>
		wrapTaskForListr(
			new RunServiceTask(
				{
					...service,
					network: network,
					volume: volume,
				},
				docker,
			),
		),
	);
}

export function createEntrypointTasks(
	entrypoints: RunEntrypointTaskOptions[],
	docker: Docker,
	network: Docker.Network,
): Array<ListrTask> {
	return entrypoints.map((entrypoint) =>
		wrapTaskForListr(
			new RunEntrypointTask(
				{
					...entrypoint,
					network,
				},
				docker,
			),
		),
	);
}

/**
 * Get tasks to creat a local API Gateway for set of APIs
 * @param stackName of the project stack
 * @param apis to generate gateways for
 * @param docker handle to run the gateways containers
 * @param network to connect the gateway containers to
 */
export function createGatewayTasks(
	stackName: string,
	apis: RunGatewayTaskOptions[],
	docker: Docker,
	network: Docker.Network,
): Array<ListrTask> {
	return apis.map((api) =>
		wrapTaskForListr(
			new RunGatewayTask({
				...api,
				stackName,
				docker,
				network,
			}),
		),
	);
}

/**
 * Task to run local API Gateways for the provided APIs. For local dev and testing only.
 * @param stackName of the project stack
 * @param apis to generate sub-tasks for
 * @param docker handle to run the gateway containers
 */
export function createGatewayContainerRunTasks(
	stackName: string,
	apis: RunGatewayTaskOptions[],
	docker: Docker,
): (ctx, task) => Listr {
	return (ctx, task: TaskWrapper<unknown, typeof ListrRenderer>): Listr => {
		return task.newListr(createGatewayTasks(stackName, apis, docker, ctx.network), {
			concurrent: true,
			// Don't fail all on a single function failure...
			exitOnError: false,
			// Added to allow custom handling of SIGINT for run cmd cleanup.
			registerSignalListeners: false,
		});
	};
}

/**
 * Listrception: Creates service sub-tasks for the 'Running Services' listr task (see createServiceTasks)
 * which will be run in parallel
 */
export function createServiceContainerRunTasks(
	functions: RunServiceTaskOptions[],
	docker: Docker,
): (ctx, task) => Listr {
	return (ctx, task: TaskWrapper<unknown, typeof ListrRenderer>): Listr => {
		return task.newListr(createServiceTasks(functions, docker, ctx.network, ctx.volume), {
			concurrent: true,
			// Don't fail all on a single function failure...
			exitOnError: false,
			// Added to allow custom handling of SIGINT for run cmd cleanup.
			registerSignalListeners: false,
		});
	};
}

export function createEntrypointContainerRunTasks(
	entrypoints: RunEntrypointTaskOptions[],
	docker: Docker,
): (ctx, task) => Listr {
	return (ctx, task: TaskWrapper<unknown, typeof ListrRenderer>): Listr => {
		return task.newListr(createEntrypointTasks(entrypoints, docker, ctx.network), {
			concurrent: true,
			// Don't fail all on a single function failure...
			exitOnError: false,
			// Added to allow custom handling of SIGINT for run cmd cleanup.
			registerSignalListeners: false,
		});
	};
}

/**
 * Top level listr run task displayed to the user
 * Will display tasks for creating docker resources
 */
export function createRunTasks(
	stack: Stack,
	functions: RunServiceTaskOptions[],
	apis: RunGatewayTaskOptions[],
	entrypoints: RunEntrypointTaskOptions[],
	docker: Docker,
	runId: string,
): Listr {
	// const entrypointsTask = entrypoints
	// 	? [
	// 			wrapTaskForListr({
	// 				name: 'Starting Entrypoints Proxy',
	// 				factory: (ctx) => new RunEntrypointsTask({ stack, docker, network: ctx.network, port: entrypointPort }),
	// 			}),
	// 	  ]
	// 	: [];

	return new Listr<ListrCtx>(
		[
			// Create ephemeral docker network for this run
			wrapTaskForListr(new CreateNetworkTask({ name: `${stack.getName()}-net-${runId}`, docker }), 'network'),
			// Create ephemeral docker volume for this run
			wrapTaskForListr(
				new CreateVolumeTask({
					volumeName: `${stack.getName()}-vol-${runId}`,
					dockerClient: docker,
				}),
				'volume',
			),
			// Run the service containers, attached to the network and volume
			{
				title: 'Running Services',
				task: createServiceContainerRunTasks(functions, docker),
			},
			// Start the APIs, to route requests to the services
			{
				title: 'Starting API Gateways',
				task: createGatewayContainerRunTasks(stack.getName(), apis, docker),
			},
			// Start the entrypoints (load balancer/CDN emulation)
			{
				title: 'Starting Entrypoints',
				task: createEntrypointContainerRunTasks(entrypoints, docker),
			},
		],
		{
			// Added to allow custom handling of SIGINT for run cmd cleanup.
			registerSignalListeners: false,
			rendererOptions: {
				collapseErrors: false,
			},
		},
	);
}

/**
 * Sorts images by the name of the service they contain.
 * NOTE: Returns a new sorted array
 */
export function sortImages(images: NitricImage[]): NitricImage[] {
	const imagesCopy = [...images];
	imagesCopy.sort(({ serviceName: nameA }, { serviceName: nameB }) => {
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}
		return 0;
	});

	return imagesCopy;
}

/**
 * Nitric CLI run command
 * Extends the build command to run the built docker images locally for testing.
 */
export default class Run extends BaseCommand {
	private volume: Volume | undefined = undefined;
	private network: Network | undefined = undefined;

	static description = 'builds and runs a project locally for testing';
	static examples = [`$ nitric run`];
	static args = [...Build.args];

	static flags = {
		...BaseCommand.flags,
		...Build.flags,
	};

	//TODO: Allow for custom docker connection
	private docker = new Docker(/*{host: '127.0.0.1', port: 3000}*/);

	private runningContainers: { [key: string]: Docker.Container } | undefined = undefined;
	getRunningContainers = (): { [key: string]: Docker.Container } | undefined => {
		return this.runningContainers;
	};

	getCurrentNetwork = (): Network | undefined => {
		return this.network;
	};

	/**
	 * Runs a container for each service, api and entrypoint in the Nitric Stack
	 */
	runContainers = async (stack: Stack, directory: string, runId: string): Promise<void> => {
		const nitricStack = stack.asNitricStack();
		const { apis = {}, entrypoints = {} } = nitricStack;
		const namedApis = Object.keys(apis).map((name) => ({ name, ...apis[name] }));
		const namedEntrypoints = Object.entries(entrypoints).map(([name, entrypoint]) => ({ name, ...entrypoint }));

		cli.action.stop();

		// Build the container images for each service in the project stack
		const builtImages = (await createBuildTasks(stack, directory).run()) as { [key: string]: NitricImage };

		// Filter out undefined and non-image results from build tasks
		let images = Object.values(builtImages).filter((i) => i && i.serviceName) as NitricImage[];

		// Generate a range of ports to try to assign to containers
		const portRange = getPortRange();

		// Images are sorted to ensure they're typically assigned the same port between reloads.
		images = sortImages(images);

		const runGatewayOptions = await Promise.all(
			namedApis.map(async (api) => {
				return {
					stackName: nitricStack.name,
					runId,
					api,
					port: await getPort({ port: portRange }),
				} as RunGatewayTaskOptions;
			}),
		);

		const runServicesTaskOptions = await Promise.all(
			images.map(async (image) => {
				return {
					image,
					runId,
					port: await getPort({ port: portRange }),
					subscriptions: getContainerSubscriptions(nitricStack),
				} as RunServiceTaskOptions;
			}),
		);

		const runEntrypointOptions = await Promise.all(
			namedEntrypoints.map(async (entrypoint) => {
				return {
					entrypoint,
					stack,
					runId,
					port: await getPort({ port: portRange }),
				} as RunEntrypointTaskOptions;
			}),
		);

		// Capture the results of running tasks to setup docker network, volume and service containers
		const runTaskResults = await createRunTasks(
			stack,
			runServicesTaskOptions,
			runGatewayOptions,
			runEntrypointOptions,
			this.docker,
			runId,
		).run();

		// Capture created docker resources for cleanup on run termination (see cleanup())
		const {
			network: newNetwork,
			volume: newVolume,
			...results
		}: { [key: string]: Container } & { network: Network; volume: Volume } = runTaskResults;

		this.volume = newVolume;
		this.network = newNetwork;
		this.runningContainers = results;

		// Present a list of service and api containers and their ports on the cli
		cli.table(runServicesTaskOptions, {
			service: {
				get: (row): string => row.image && row.image.serviceName,
			},
			port: {},
		});

		if (nitricStack.apis) {
			cli.table(runGatewayOptions, {
				api: {
					get: (row): string => row.api && row.api.name,
				},
				port: {},
			});
		}

		if (nitricStack.entrypoints) {
			cli.table(runEntrypointOptions, {
				entrypoint: {
					get: (row): string => row.entrypoint.name,
				},
				url: {
					get: (row): string => `http://localhost:${row.port}`,
				},
			});
		}

		cli.action.start("Running, press 'Q' to clean up and exit");
	};

	/**
	 * Cleanup created docker assets for this instance of Run
	 */
	cleanup = async (): Promise<void> => {
		const { network, volume, runningContainers: runResults } = this;

		try {
			if (runResults) {
				// Stop all containers and clean them up
				await Promise.all(
					Object.values(runResults).map(async (container) => {
						if (container && container.stop) {
							try {
								await container.stop();
							} catch (error) {
								if (error.statusCode && error.statusCode === 304) {
									cli.log(`Container stop error: ${(await container.inspect()).Name} already stopped.`);
								} else {
									cli.log('Container stop error:', error);
								}
							} finally {
								try {
									await container.remove();
								} catch (error) {
									cli.log('Container remove error:', error);
								}
							}
						}
					}),
				);
			}

			// Remove the docker network if one was created
			if (network) {
				try {
					await network.remove();
				} catch (error) {
					cli.log('Network remove error:', error);
				}
			}

			// Remove the docker volume if one was created
			if (volume) {
				try {
					await volume.remove();
				} catch (error) {
					cli.log('Volume remove error:', error);
				}
			}
			cli.action.stop();
		} catch (error) {
			cli.error('Unexpected error:', error);
			throw error;
		}
	};

	/**
	 * Oclif command entrypoint
	 */
	do = async (): Promise<void> => {
		const { runContainers, cleanup } = this;
		const { args, flags } = this.parse(Run);
		const { file = './nitric.yaml' } = flags;
		const { directory = '.' } = args;
		const stack = await Stack.fromFile(path.join(directory, file));

		// Check docker daemon is running
		try {
			execa.sync('docker', ['ps']);
		} catch (error) {
			const origErrs: string[] = error.errors && error.errors.length ? error.errors : [error.stack];
			cli.info("Docker daemon not found! Ensure it's running.");
			throw new Error(`${origErrs.join('\n')}`);
		}

		// Generate a random 8 char string, used to avoid name collisions
		// also assists with finding resources to delete on cleanup
		const runId: string = await new Promise((res, rej) => {
			crypto.randomBytes(4, (err, buffer) => {
				if (err) {
					rej(err);
				} else {
					res(buffer.toString('hex'));
				}
			});
		});

		// Run the stack
		try {
			await runContainers(stack, directory, runId);

			// Wait for Q keypress to stop and quit
			readline.emitKeypressEvents(process.stdin);

			const cleanUp = new Promise((res, rej) => {
				process.stdin.on('keypress', (_, key) => {
					if (key && (key.name == 'q' || (key.ctrl && key.name == 'c'))) {
						process.stdin.pause();
						cli.action.start('Exiting, please wait');
						cleanup().then(res).catch(rej);
					}
				});
			});

			process.stdin.setRawMode!(true);
			process.stdin.resume();

			await cleanUp;

			// Is a must for windows
			process.exit(0);
		} catch (error) {
			const origErrs: string[] = error.errors && error.errors.length ? error.errors : [error.stack];
			throw new Error(`Something went wrong, see error details.\n ${origErrs.join('\n')}`);
		}
	};
}

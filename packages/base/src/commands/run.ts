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
import Build from './build';
import {
	BaseCommand,
	Stack,
	wrapTaskForListr,
	ContainerImage,
	NitricStack,
	createBuildListrTask,
} from '@nitric/cli-common';
import { Listr, ListrTask, ListrContext, ListrRenderer } from 'listr2';
import path from 'path';
import execa from 'execa';
import Docker, { Network } from 'dockerode';
import getPort from 'get-port';
import readline from 'readline';

import {
	CreateNetworkTask,
	RunEntrypointTask,
	RunEntrypointTaskOptions,
	RunGatewayTask,
	RunGatewayTaskOptions,
	RunContainerTask,
	RunContainerTaskOptions,
	RunStorageServiceTask,
	RunStorageServiceTaskOptions,
	RunContainerResult,
} from '../tasks';
import { TaskWrapper } from 'listr2/dist/lib/task-wrapper';
import crypto from 'crypto';

interface KnownListrCtx {
	network: Network;
}

type ListrCtx = { [key: string]: any } & KnownListrCtx & ListrContext;

// Lowest available ephemeral port
export const MIN_PORT = 49152; // start of ephemeral port range, as defined by IANA

// Highest available ephemeral port
export const MAX_PORT = 65535; // end of ephemeral port range, as defined by IANA

/**
 * Creates a list of local source endpoints, which are used by locally running
 * containers to push messages directly to their subscribers.
 *
 * Used to simulate pub/sub connections for local testing only.
 *
 * @param stack used to generate the full subscriber list for every topic.
 */
export function getContainerSubscriptions({
	topics = {},
	functions = {},
	containers = {},
}: NitricStack): Record<string, string[]> | undefined {
	const namedTopics = Object.keys(topics).map((name) => ({ name, ...topics[name] }));
	const namedFunctions = Object.keys(functions).map((name) => ({ name, ...functions[name] }));
	const namedContainers = Object.keys(containers).map((name) => ({ name, ...containers[name] }));

	// Find and return the subscribed functions and containers for each topic
	return namedTopics.reduce((subs, topic) => {
		// Retrieve the URLs for each function and source, for direct http based topic pubs
		const functionSubs = namedFunctions
			.filter(({ triggers }) => {
				return triggers && (triggers.topics || []).filter((name) => name === topic.name).length > 0;
			})
			.map((func) => `http://${func.name}:9001`);

		const containerSubs = namedContainers
			.filter(({ triggers }) => {
				return triggers && (triggers.topics || []).filter((name) => name === topic.name).length > 0;
			})
			.map((container) => `http://${container.name}:9001`);

		return {
			...subs,
			[topic.name]: [...functionSubs, ...containerSubs],
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
 * Returns an array of Listr wrapped RunFunctionTasks
 * @param functions to run
 * @param docker handle to use when running the functions
 * @param network docker network to use with the function containers
 */
export function createContainerTasks(
	stack: Stack,
	functions: RunContainerTaskOptions[],
	docker: Docker,
	network: Docker.Network,
): Array<ListrTask> {
	return functions.map((func) =>
		wrapTaskForListr(
			new RunContainerTask(
				{
					...func,
					stack,
					network: network,
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

export function createStorageServiceTask(
	opts: RunStorageServiceTaskOptions,
	docker: Docker,
	network: Docker.Network,
): ListrTask {
	return wrapTaskForListr(new RunStorageServiceTask({ ...opts, network }, docker));
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
 * Listrception: Creates source sub-tasks for the 'Running Containers' listr task (see createContainerTasks)
 * which will be run in parallel
 */
export function createContainerRunTasks(
	stack: Stack,
	containers: RunContainerTaskOptions[],
	docker: Docker,
): (ctx, task) => Listr {
	return (ctx, task: TaskWrapper<unknown, typeof ListrRenderer>): Listr => {
		return task.newListr(createContainerTasks(stack, containers, docker, ctx.network), {
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

export function createStorageRunTask(storage: RunStorageServiceTaskOptions, docker: Docker): (ctx, task) => Listr {
	return (ctx, task: TaskWrapper<unknown, typeof ListrRenderer>): Listr => {
		return task.newListr(createStorageServiceTask(storage, docker, ctx.network), {
			// Don't fail all on a single function failure...
			exitOnError: true,
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
	storage: RunStorageServiceTaskOptions,
	containers: RunContainerTaskOptions[],
	apis: RunGatewayTaskOptions[],
	entrypoints: RunEntrypointTaskOptions[],
	docker: Docker,
	runId: string,
): Listr {
	return new Listr<ListrCtx>(
		[
			// Create ephemeral docker network for this run
			wrapTaskForListr(new CreateNetworkTask({ name: `${stack.getName()}-net-${runId}`, docker }), 'network'),
			// Run the functions & containers, attached to the network
			{
				title: 'Running Storage Service',
				task: createStorageRunTask(storage, docker),
			},
			{
				task: createContainerRunTasks(stack, containers, docker),
			},
			// Start the APIs, to route requests to the containers
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
 * Sorts images by the name of the function/source they contain.
 * NOTE: Returns a new sorted array
 */
export function sortImages(images: ContainerImage[]): ContainerImage[] {
	const imagesCopy = [...images];
	imagesCopy.sort(({ name: nameA }, { name: nameB }) => {
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
	 * Runs a source for each source, function, api and entrypoint in the Nitric Stack
	 */
	runContainers = async (stack: Stack, runId: string): Promise<void> => {
		const nitricStack = stack.asNitricStack();
		const { entrypoints = {}, buckets = {} } = nitricStack;
		const namedEntrypoints = Object.entries(entrypoints).map(([name, entrypoint]) => ({ name, ...entrypoint }));
		const namedBuckets = Object.entries(buckets).map(([name, bucket]) => ({ name, ...bucket }));

		cli.action.stop();

		// Build the source images for each function in the project stack
		const builtImages = (await new Listr([createBuildListrTask(stack)]).run()) as { [key: string]: ContainerImage };

		// Filter out undefined and non-image results from build tasks
		let images = Object.values(builtImages).filter((i) => i && i.name) as ContainerImage[];

		// Generate a range of ports to try to assign to containers
		const portRange = getPortRange();

		// Images are sorted to ensure they're typically assigned the same port between reloads.
		images = sortImages(images);

		const runGatewayOptions = await Promise.all(
			stack.getApis().map(async (api) => {
				return {
					stackName: nitricStack.name,
					runId,
					api,
					port: await getPort({ port: portRange }),
				} as RunGatewayTaskOptions;
			}),
		);

		const runContainersTaskOptions = await Promise.all(
			images.map(async (image) => {
				return {
					image,
					runId,
					port: await getPort({ port: portRange }),
					subscriptions: getContainerSubscriptions(nitricStack),
				} as RunContainerTaskOptions;
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

		const runStorageOptions = {
			buckets: namedBuckets,
			stack,
			runId,
		} as RunStorageServiceTaskOptions;

		// Capture the results of running tasks to setup docker network, functions and containers
		const runTaskResults = await createRunTasks(
			stack,
			runStorageOptions,
			runContainersTaskOptions,
			runGatewayOptions,
			runEntrypointOptions,
			this.docker,
			runId,
		).run();

		// Capture created docker resources for cleanup on run termination (see cleanup())
		const { network: newNetwork, ...results }: { [key: string]: RunContainerResult } & { network: Network } =
			runTaskResults;

		this.network = newNetwork;
		this.runningContainers = Object.keys(results).reduce(
			(acc, k) => ({
				...acc,
				[k]: results[k].container,
			}),
			{},
		);

		// Present a list of containers (inc. functions and APIs) and their ports on the cli
		const runningContainers = Object.keys(results)
			.filter((k) => results[k].type === 'container')
			.map((k) => results[k].name);
		cli.table(runContainersTaskOptions, {
			function: {
				get: (row): string => row.image && row.image.name,
			},
			port: {
				get: (row): string | number => (runningContainers.includes(row.image.name) && row.port) || 'Failed to start',
			},
		});

		if (nitricStack.apis) {
			const runningApis = Object.keys(results)
				.filter((k) => results[k].type === 'api')
				.map((k) => results[k].name);
			cli.table(runGatewayOptions, {
				api: {
					get: (row): string => row.api && row.api.name,
				},
				port: {
					get: (row): string | number => (runningApis.includes(row.api.name) && row.port) || 'Failed to start',
				},
			});
		}

		if (nitricStack.entrypoints) {
			const runningEntrypoints = Object.keys(results)
				.filter((k) => results[k].type === 'entrypoint')
				.map((k) => results[k].name);
			cli.table(runEntrypointOptions, {
				entrypoint: {
					get: (row): string => row.entrypoint.name,
				},
				url: {
					get: (row): string =>
						(runningEntrypoints.includes(row.entrypoint.name) && `http://localhost:${row.port}`) || 'Failed to start',
				},
			});
		}

		cli.action.start("Running, press 'Q' to clean up and exit");
	};

	/**
	 * Cleanup created docker assets for this instance of Run
	 */
	cleanup = async (): Promise<void> => {
		const { network, runningContainers: runResults } = this;

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
		} catch {
			throw new Error(
				"Docker daemon was not found!\nTry using 'Nitric doctor' to confirm it is correctly installed, and check that the service is running.",
			);
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
			await runContainers(stack, runId);

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

			if (process.stdin.setRawMode) {
				process.stdin.setRawMode(true);
				process.stdin.resume();
			}

			await cleanUp;

			// Is a must for windows
			process.exit(0);
		} catch (error) {
			const origErrs: string[] = error.errors && error.errors.length ? error.errors : [error.stack];
			throw new Error(`Something went wrong, see error details.\n ${origErrs.join('\n')}`);
		}
	};
}

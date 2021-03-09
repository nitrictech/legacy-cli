import { Command } from '@oclif/command';
import cli from 'cli-ux';
import Build, { createBuildTasks } from './build';
import { Stack, wrapTaskForListr, NitricImage, NitricStack, NitricEntrypoints } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import Docker, { Network, Container, Volume } from 'dockerode';
import getPort from 'get-port';
import {
	RunFunctionTask,
	RunFunctionTaskOptions,
	CreateNetworkTask,
	CreateVolumeTask,
	RunGatewayTask,
	RunGatewayTaskOptions,
	RunEntrypointsTask,
} from '../tasks/run';

interface KnownListrCtx {
	network: Network;
	volume: Volume;
}
type ListrCtx = { [key: string]: any } & KnownListrCtx & Listr.ListrContext;

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
export function getContainerSubscriptions(stack: NitricStack): Record<string, string[]> | undefined {
	return stack.functions?.reduce((subs, func) => {
		func.subs?.forEach(({ topic }) => {
			subs[topic] = subs[topic] || [];
			// TODO: Don't hardcode 9001 port, pull from config or env.
			subs[topic].push(`http://${func.name}:9001`);
		});
		return subs;
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
 * @param functions the functions to run
 * @param docker the docker handle to use when running the functions
 * @param network the docker network to use with the function containers
 * @param volume the docker volume to mount in the function containers
 */
export function createFunctionTasks(
	functions: RunFunctionTaskOptions[],
	docker: Docker,
	network: Docker.Network,
	volume: Docker.Volume,
): Array<Listr.ListrTask> {
	return functions.map((func) =>
		wrapTaskForListr(
			new RunFunctionTask(
				{
					...func,
					network: network,
					volume: volume,
				},
				docker,
			),
		),
	);
}

export function createGatewayTasks(
	stackName: string,
	apis: RunGatewayTaskOptions[],
	docker: Docker,
	network: Docker.Network,
): Array<Listr.ListrTask> {
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

export function createGatewayContainerRunTasks(
	stackName: string,
	apis: RunGatewayTaskOptions[],
	docker: Docker,
): (ctx) => Listr {
	return (ctx): Listr => {
		return new Listr(createGatewayTasks(stackName, apis, docker, ctx.network), {
			concurrent: true,
			// Don't fail all on a single function failure...
			exitOnError: false,
		});
	};
}

/**
 * Listrception: Creates function substasks for the 'Running Functions' listr task (see createRunTasks)
 * which will be run in parallel
 */
export function createFunctionContainerRunTasks(functions: RunFunctionTaskOptions[], docker: Docker): (ctx) => Listr {
	return (ctx): Listr => {
		return new Listr(createFunctionTasks(functions, docker, ctx.network, ctx.volume), {
			concurrent: true,
			// Don't fail all on a single function failure...
			exitOnError: false,
		});
	};
}

/**
 * Top level listr run task displayed to the user
 * Will display tasks for creating docker resources
 */
export function createRunTasks(
	stack: Stack,
	functions: RunFunctionTaskOptions[],
	apis: RunGatewayTaskOptions[],
	docker: Docker,
	entrypoints?: NitricEntrypoints,
): Listr {
	const entrypointsTask = entrypoints
		? [
			wrapTaskForListr({
				name: 'Starting Entrypoints Proxy',
				factory: (ctx) => new RunEntrypointsTask({ stack, docker, network: ctx.network }),
			}),
		  ]
		: [];

	return new Listr<ListrCtx>([
		wrapTaskForListr(new CreateNetworkTask({ name: `${stack.getName()}-net`, docker }), 'network'),
		wrapTaskForListr(new CreateVolumeTask({ volumeName: `${stack.getName()}-vol`, dockerClient: docker }), 'volume'),
		{
			title: 'Running Functions',
			task: createFunctionContainerRunTasks(functions, docker),
		},
		{
			title: 'Starting API Gateways',
			task: createGatewayContainerRunTasks(stack.getName(), apis, docker),
		},
		...entrypointsTask
	]);
}

/**
 * Sorts images by their function names
 * NOTE: Returns a new sorted array
 */
export function sortImages(images: NitricImage[]): NitricImage[] {
	const imagesCopy = [...images];
	imagesCopy.sort(({ func: { name: nameA } }, { func: { name: nameB } }) => {
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
export default class Run extends Command {
	private volume: Volume | undefined = undefined;
	private network: Network | undefined = undefined;

	static description = 'Builds and runs a project';
	static examples = [`$ nitric run .`];
	static args = [...Build.args];

	static flags = {
		...Build.flags,
	};

	private docker = new Docker(/*{host: '127.0.0.1', port: 3000}*/);

	private runningContainers: { [key: string]: Docker.Container } | undefined = undefined;
	getRunningContainers = (): { [key: string]: Docker.Container } | undefined => {
		return this.runningContainers;
	};

	getCurrentNetwork = (): Network | undefined => {
		return this.network;
	};

	/**
	 * Runs a container for each function in the Nitric Stack
	 */
	runContainers = async (stack: Stack, directory: string): Promise<void> => {
		const nitricStack = stack.asNitricStack();
		const { apis = [] } = nitricStack;
		cli.action.stop();

		// Build the container images for each function in the Nitric Stack
		const builtImages = await createBuildTasks(stack, directory).run();
		// Filter out undefined and non image results from build tasks
		let images = Object.values(builtImages).filter((i: any) => i && i.func) as NitricImage[];

		// Generate a range of ports to try to assign to function containers
		const portRange = getPortRange();

		// Images are sorted to ensure they're typically assigned the same port between reloads.
		images = sortImages(images);

		const runGatewayOptions = await Promise.all(
			(apis || []).map(async (api) => {
				return {
					stackName: nitricStack.name,
					api,
					port: await getPort({ port: portRange }),
				} as RunGatewayTaskOptions;
			}),
		);

		const runTaskOptions = await Promise.all(
			images.map(async (image) => {
				return {
					image,
					port: await getPort({ port: portRange }),
					subscriptions: getContainerSubscriptions(nitricStack),
				} as RunFunctionTaskOptions;
			}),
		);

		// Capture the results of running tasks to setup docker network, volume and function containers
		const runTaskResults = await createRunTasks(
			stack,
			runTaskOptions,
			runGatewayOptions,
			this.docker,
			nitricStack.entrypoints,
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

		// Present a list of containers and their ports on the cli
		cli.table(runTaskOptions, {
			function: {
				get: (row): string => row.image && row.image.func.name,
			},
			port: {},
		});

		cli.table(runGatewayOptions, {
			api: {
				get: (row): string => row.api && row.api.name,
			},
			port: {},
		});
		cli.action.start('Functions Running press ctrl-C quit');
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
								// console.log("there was an error stopping this container");
							} finally {
								await container.remove();
							}
						}
					}),
				);
			}

			// Remove the docker network if one was created
			if (network) {
				await network.remove();
			}

			// Remove the docker volume if one was created
			if (volume) {
				await volume.remove();
			}

			cli.action.stop();
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	/**
	 * Oclif command entrypoint
	 */
	run = async (): Promise<void> => {
		const { runContainers, cleanup } = this;
		const { args, flags } = this.parse(Run);
		const { file = './nitric.yaml' } = flags;
		const { directory = '.' } = args;
		const stack = await Stack.fromFile(path.join(directory, file));

		// Run the function containers
		try {
			await runContainers(stack, directory);

			// Cleanup docker resources before exiting
			process.on('SIGINT', cleanup);
		} catch (error) {
			const origErrs: string[] = error.errors && error.errors.length ? error.errors : [error.stack];
			throw new Error(`Something went wrong, see error details inline above.\n ${origErrs.join('\n')}`);
		}
	};
}

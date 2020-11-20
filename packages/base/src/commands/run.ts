import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import Build, { createBuildTasks } from './build';
import { readNitricDescriptor, wrapTaskForListr, NitricImage, NitricStack } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import Docker, { Network, Container, Volume } from 'dockerode';
import getPort from 'get-port';
import { RunFunctionTask, RunFunctionTaskOptions, CreateNetworkTask, CreateVolumeTask } from '../tasks/run';

import keypress from 'keypress';
import clear from 'clear';

const docker = new Docker(/*{host: '127.0.0.1', port: 3000}*/);

interface KnownListrCtx {
	network: Network;
	volume: Volume;
}
type ListrCtx = { [key: string]: any } & KnownListrCtx & Listr.ListrContext;

export function createRunTasks(stackName: string, functions: RunFunctionTaskOptions[], docker?: Docker): Listr {
	return new Listr<ListrCtx>([
		wrapTaskForListr(new CreateNetworkTask({ name: `${stackName}-net`, docker }), 'network'),
		wrapTaskForListr(new CreateVolumeTask({ volumeName: `${stackName}-vol`, dockerClient: docker }), 'volume'),
		{
			title: 'Running Functions',
			task: (ctx): Listr => {
				return new Listr(
					functions.map((func) =>
						wrapTaskForListr(
							new RunFunctionTask(
								{
									...func,
									network: ctx.network,
									volume: ctx.volume,
								},
								docker,
							),
						),
					),
					{
						concurrent: true,
						// Don't fail all on a single function failure...
						exitOnError: false,
					},
				);
			},
		},
	]);
}

let runResults: { [key: string]: Docker.Container } | undefined = undefined;
function getRunResults(): { [key: string]: Docker.Container } | undefined {
	return runResults;
}

let network: Network | undefined = undefined;
function getCurrentNetwork(): Network | undefined {
	return network;
}

let volume: Volume | undefined = undefined;
function getCurrentVolume(): Volume | undefined {
	return volume;
}

/**
 * Function for running containers
 */
async function runContainers(stack: NitricStack, portStart: number, directory: string): Promise<void> {
	cli.action.stop();
	clear();

	const currentRunResults = getRunResults();
	const currentNetwork = getCurrentNetwork();
	const builtImages = await createBuildTasks(stack, directory).run();
	const images = Object.values(builtImages) as NitricImage[];

	if (currentRunResults) {
		await Promise.all(
			Object.values(currentRunResults).map(async (container) => {
				// FIXME: only attempt to stop if currently running
				await container.stop();
				return container.remove();
			}),
		);
	}

	if (currentNetwork) {
		await currentNetwork.remove();
	}

	const rangeLength = images.length * 2;
	const portRange = getPort.makeRange(portStart, portStart + rangeLength);

	const runTaskOptions = await Promise.all(
		images.map(async (image) => {
			return {
				image,
				port: await getPort({ port: portRange }),
				subscriptions: stack.functions?.reduce((subs, func) => {
					func.subs?.forEach(({ topic }) => {
						subs[topic] = subs[topic] || [];
						subs[topic].push(`http://${func.name}:9001`);
					});
					return subs;
				}, {} as Record<string, string[]>),
			} as RunFunctionTaskOptions;
		}),
	);

	const {
		network: newNetwork,
		volume: newVolume,
		...results
	}: { [key: string]: Container } & { network: Network; volume: Volume } = await createRunTasks(
		stack.name,
		runTaskOptions,
		docker,
	).run();

	volume = newVolume;
	network = newNetwork;
	runResults = results;

	cli.table(runTaskOptions, {
		function: {
			get: (row): string => row.image && row.image.func.name,
		},
		port: {},
	});
	cli.action.start('Functions Running press r to refresh or q to quit');
}

/**
 * Nitric CLI run command
 * Extends the build command to run the built docker images locally for testing.
 */
export default class Run extends Command {
	static description = 'Builds and runs a project';

	static examples = [`$ nitric run .`];

	static args = [...Build.args];

	static flags = {
		...Build.flags,
		portStart: flags.integer(),
	};

	async run(): Promise<void> {
		// Setup stdin for emitting keypress events
		keypress(process.stdin);
		process.stdin.setRawMode!(true);
		process.stdin.resume();

		const { args, flags } = this.parse(Run);
		const { portStart = 3000, file = './nitric.yaml' } = flags;
		const { directory = '.' } = args;
		const stack = readNitricDescriptor(path.join(directory, file));

		// Run the images
		try {
			await runContainers(stack, portStart, directory);

			process.stdin.on('keypress', async (str) => {
				// quit the application
				if (str === 'q') {
					try {
						if (runResults) {
							await Promise.all(
								Object.values(runResults).map(async (container) => {
									await container.stop();
									return container.remove();
								}),
							);
						}

						if (network) {
							await network.remove();
						}

						if (volume) {
							await volume.remove();
						}

						cli.action.stop();
						// As we have stdin set to raw mode pausing will cause the process to gracefully exit
						process.stdin.pause();
					} catch (error) {
						console.error(error);
						throw error;
					}
				} else if (str === 'r') {
					await runContainers(stack, portStart, directory);
				}
			});

			// return runResults;
		} catch (error) {
			throw new Error('Something went wrong, see error details inline above.');
		}
	}
}

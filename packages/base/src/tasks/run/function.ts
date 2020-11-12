import { Task, NitricImage } from '@nitric/cli-common';
import getPort from 'get-port';
import Docker, { Container, Network, NetworkInspectInfo, ContainerCreateOptions, Volume } from 'dockerode';
import { createNitricLogDir, functionLogFilePath } from '../../utils';
import fs from 'fs';

const GATEWAY_PORT = 9001;

export interface RunFunctionTaskOptions {
	image: NitricImage;
	port: number | undefined;
	subscriptions?: Record<string, string[]>;
	network?: Network;
	volume?: Volume;
}

export class RunFunctionTask extends Task<Container> {
	private image: NitricImage;
	private port: number | undefined;
	private docker: Docker;
	private network: Network | undefined;
	private volume: Volume | undefined;
	private subscriptions: Record<string, string[]> | undefined;

	constructor({ image, port, network, subscriptions, volume }: RunFunctionTaskOptions, docker?: Docker) {
		super(`${image.func.name} - ${image.id.substring(0, 12)}`);
		this.image = image;
		this.port = port;
		this.docker = docker || new Docker();
		this.network = network;
		this.volume = volume;
		this.subscriptions = subscriptions;
	}

	async do(): Promise<Container> {
		const { network, subscriptions, volume } = this;

		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		const networkName = network ? ((await network?.inspect()) as NetworkInspectInfo).Name : 'bridge';

		if (networkName === 'bridge') {
			console.warn('Failed to set custom docker network on containers, defaulting to bridge network.');
		}

		const dockerOptions = {
			Env: [`LOCAL_SUBSCRIPTIONS=${JSON.stringify(subscriptions)}`],
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Volumes: {},
			Hostconfig: {
				NetworkMode: networkName,
				PortBindings: {
					[`${GATEWAY_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
				},
			},
		} as ContainerCreateOptions;

		// Join custom network, if configured
		if (networkName !== 'bridge') {
			dockerOptions['NetworkingConfig'] = {
				EndpointsConfig: {
					[networkName]: {
						Aliases: [this.image.func.name],
					},
				},
			};
		}

		// Add storage volume, if configured
		const MOUNT_POINT = '/nitric/';
		if (volume) {
			dockerOptions['Volumes'] = {
				[MOUNT_POINT]: {},
			};
			dockerOptions['HostConfig'] = {
				Mounts: [
					{
						Target: MOUNT_POINT,
						Source: volume.name,
						Type: 'volume',
					},
				],
			};
		}

		const imageRunLogFile = functionLogFilePath(this.name);

		// Create the log directory and file if either don't exist
		createNitricLogDir();
		fs.openSync(imageRunLogFile, 'w');

		// Create a stream to the log file for the containers stdio
		const stdioStream = fs.createWriteStream(imageRunLogFile);

		const runResult = await this.docker.run(
			this.image.id,
			[],
			// process.stdout,
			stdioStream,
			dockerOptions,
			(containerError: any, data: any, __: any) => {
				if (containerError) {
					//TODO: handle this better
					console.log(containerError);
				}

				if (data && data.StatusCode) {
					console.log('Status: ' + data.StatusCode);
				}
			},
		);

		const container: Container = await new Promise((res, rej) => {
			runResult.on('container', (container: Container) => {
				this.update(`Container ${container.id.substring(0, 12)} listening on: ${this.port}`);
				res(container);
			});
			setTimeout(() => {
				rej(new Error(`Container for image ${this.image.id} not started after 2 seconds.`));
			}, 2000);
		});

		return container;
	}
}

export class Cleanup extends Task<void> {
	async do(): Promise<void> {
		return;
	}
}

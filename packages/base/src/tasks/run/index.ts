import { Task, NitricImage } from '@nitric/cli-common';
import getPort from 'get-port';
import Docker, { Container, Network, NetworkInspectInfo, ContainerCreateOptions } from 'dockerode';
import fs from 'fs';
import { LOG_DIR } from '../../common/paths';

const GATEWAY_PORT = 9001;

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export interface CreateNetworkTaskOptions {
	name: string;
	docker?: Docker;
}

export class CreateNetworkTask extends Task<Network> {
	private networkName: string;
	private docker: Docker;

	constructor({ name, docker = new Docker() }) {
		super(`Creating docker network`);
		this.networkName = name;
		this.docker = docker;
	}

	async do(): Promise<Network> {
		const { networkName, docker } = this;
		const network = await docker.createNetwork({
			Name: networkName,
			// Driver: "bridge",
		});
		console.log('network', network);
		return network;
	}
}

export interface RunFunctionTaskOptions {
	image: NitricImage;
	port: number | undefined;
	subscriptions?: Record<string, string[]>;
	network?: Network;
}

export class RunFunctionTask extends Task<Container> {
	private image: NitricImage;
	private port: number | undefined;
	private docker: Docker;
	private network: Network | undefined;
	private subscriptions: Record<string, string[]> | undefined;

	constructor({ image, port, network, subscriptions }: RunFunctionTaskOptions, docker?: Docker) {
		super(`${image.func.name} - ${image.id.substring(0, 12)}`);
		this.image = image;
		this.port = port;
		this.docker = docker || new Docker();
		this.network = network;
		this.subscriptions = subscriptions;
	}

	async do(): Promise<Container> {
		const { network, subscriptions } = this;

		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		const networkName = network ? ((await network?.inspect()) as NetworkInspectInfo).Name : 'bridge';
		const networkDebug = await network?.inspect();
		console.debug('Network Deets: ', networkDebug);
		if (networkName === 'bridge') {
			console.warn('Network not set on containers, defaulting to bridge network');
		}

		const dockerOptions = {
			Env: [`LOCAL_SUBSCRIPTIONS=${JSON.stringify(subscriptions)}`],
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
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

		if (networkName !== 'bridge') {
			dockerOptions['NetworkingConfig'] = {
				EndpointsConfig: {
					[networkName]: {
						Aliases: [this.image.func.name],
					},
				},
			};
		}

		const imageRunLogFile = `${LOG_DIR}/${this.name}.txt`;

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

import { Task, NitricImage } from '@nitric/cli-common';
import getPort from 'get-port';
import Docker from 'dockerode';
import { Container } from 'dockerode';
import fs from 'fs';
import { LOG_DIR } from '../../common/paths';

const GATEWAY_PORT = 9001;

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export interface RunFunctionTaskOptions {
	image: NitricImage;
	port: number | undefined;
}

export class RunFunctionTask extends Task<Container> {
	private image: NitricImage;
	private port: number | undefined;
	private docker: Docker;

	constructor({ image, port }: RunFunctionTaskOptions, docker?: Docker) {
		super(`${image.func.name} - ${image.id.substring(0, 12)}`);
		this.image = image;
		this.port = port;
		this.docker = docker || new Docker();
	}

	async do(): Promise<Container> {
		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		const dockerOptions = {
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Hostconfig: {
				PortBindings: {
					[`${GATEWAY_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
				},
			},
		};

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
			(_: any, data: any, __: any) => {
				console.log('Status: ' + data.StatusCode);
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

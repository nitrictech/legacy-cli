import { Site, Stack, Task } from '@nitric/cli-common';
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import tar from 'tar-fs';
import fs from 'fs';
import path from 'path';
import getPort from 'get-port';

const HTTP_PORT = 80;
const NGINX_CONFIG_FILE = 'nginx.conf';

/**
 * Stage the entrypoint with the stack staging directory
 */
export async function stageStackEntrypoint(stack: Stack, nginxConf: string): Promise<void> {
	// Get the staging directory for the stack
	const configFile = path.join(stack.getStagingDirectory(), NGINX_CONFIG_FILE);
	await fs.promises.writeFile(configFile, nginxConf);
}

/**
 * Creates a nginx configuration to act as a single host entrypoint
 * For nitric resources
 * @param entrypoints
 */
export function createNginxConfig(stack: Stack): string {
	const { entrypoints } = stack.asNitricStack();

	if (!entrypoints) {
		throw new Error('Cannot create nginx config for stack with no entrypoints');
	}

	const eps = Object.keys(entrypoints).map((e) => ({
		path: e,
		...entrypoints[e],
	}));

	const sites = eps.filter((e) => e.type === 'site');
	const apis = eps.filter((e) => e.type === 'api');

	return `
	events {}
	http {
		include mime.types;
		server {
			${sites
				.map(
					(s) => `
				location ${s.path} {
					root /www/${s.name};
				}
			`,
				)
				.join('\n')}

			${apis
				.map(
					(a) => `
				location ${a.path} {
					proxy_pass http://${stack.getName()}-${a.name}:8080;
				}
			`,
				)
				.join('\n')}
		}
	}
	`;
}

interface RunEntrypointsTaskOptions {
	stack: Stack;
	network?: Network;
	docker: Docker;
	port?: number;
}

/**
 * RunEntrypointsTask
 */
export class RunEntrypointsTask extends Task<Container> {
	private stack: Stack;
	private network?: Network;
	private docker: Docker;
	private port?: number;

	constructor({ stack, docker, network, port }: RunEntrypointsTaskOptions) {
		super('Starting Entrypoints');
		this.stack = stack;
		this.network = network;
		this.docker = docker;
		this.port = port;
	}

	async do(): Promise<Container> {
		const { stack, network, docker } = this;

		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}

		// Pull nginx
		await docker.pull('nginx');

		const dockerOptions = {
			name: `${stack.getName()}-entrypoints`,
			// Pull nginx
			Image: 'nginx',
			ExposedPorts: {
				[`${HTTP_PORT}/tcp`]: {},
			},
			Volumes: {},
			HostConfig: {
				NetworkMode: networkName,
				PortBindings: {
					[`${HTTP_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
				},
			},
		} as ContainerCreateOptions;
		// Create the nginx container first
		const container = await docker.createContainer(dockerOptions);

		// Get the nginx configuration from our nitric entrypoints
		const configuration = createNginxConfig(stack);

		// Stage the file...
		await stageStackEntrypoint(stack, configuration);

		// We likely want to buffer this so we can pipe it in as a file to tar-fs
		// We still ahve to stage the configuration as part of the stack somewhere...
		const packStream = tar.pack(stack.getStagingDirectory(), {
			// Grab the nginx configuration from the staging directory
			entries: [NGINX_CONFIG_FILE],
		});

		// write the nginx configuration to the default nginx directory
		await container.putArchive(packStream, {
			// Copy nginx.conf to our nginx container
			path: '/etc/nginx/',
		});

		// Start the container...
		await container.start();

		// Copy sites onto the frontend container
		await Promise.all(
			stack.getSites().map(async (s) => {
				await Site.build(s);
				const siteTar = tar.pack(s.getAssetPath());

				const exec = await container.exec({
					Cmd: ['mkdir', '-p', `/www/${s.getName()}`],
					WorkingDir: '/',
				});

				const execStream = await exec.start({});

				await new Promise<void>((res) => {
					docker.modem.followProgress(execStream, res, this.update);
				});

				return await container.putArchive(siteTar, {
					path: `/www/${s.getName()}`,
					noOverwriteDirNonDir: false,
				});
			}),
		);

		return container;
	}
}

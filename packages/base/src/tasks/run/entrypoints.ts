import { NitricEntrypoints, Site, Stack, Task } from "@nitric/cli-common";
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import tar from 'tar-fs';
import fs from 'fs';
import path from 'path';


const HTTP_PORT = 80;
const NGINX_CONFIG_FILE = 'nginx.conf';

/**
 * Stage the entrypoint with the stack staging directory
 */
async function stageStackEntrypoint(stack: Stack, nginxConf: string): Promise<void> {
	// Get the staging directory for the stack
	const configFile = path.join(stack.getStagingDirectory(), NGINX_CONFIG_FILE);
	await fs.promises.writeFile(configFile, nginxConf);
}

/**
 * Creates a nginx configuration to act as a single host entrypoint
 * For nitric resources
 * @param entrypoints 
 */
function createNginxConfig(entrypoints: NitricEntrypoints): string {
	const eps = Object.keys(entrypoints).map(e => ({
		path: e,
		...entrypoints[e],
	}));

	const sites = eps.filter(e => e.type === "site");
	const apis = eps.filter(e => e.type === "api");

	return `
		server {
			${sites.map(s => `
				${s.path} {
					root /www/${s.name}
				}
			`).join('\n')}

			${apis.map(a => `
				${a.path} {
					proxy_pass http://${a.name}
				}
			`).join('\n')}
		}
	`;
}

interface RunEntrypointsTaskOptions {
	entrypoints: NitricEntrypoints;
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
	private entrypoints: NitricEntrypoints;
	private network?: Network;
	private docker: Docker;
	private port?: number;

	constructor({ entrypoints, stack, docker, network }: RunEntrypointsTaskOptions) {
		super('Starting Entrypoints');
		this.stack = stack;
		this.entrypoints = entrypoints;
		this.network = network;
		this.docker = docker;
	}

	async do(): Promise<Container> {
		const { stack, network, entrypoints } = this;

		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}
		
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
					[`${HTTP_PORT}/tcp`]: [{
						HostPort: `${this.port}/tcp`,
					}],
				},
			},
		} as ContainerCreateOptions;
		// Create the nginx container first
		const container = await this.docker.createContainer(dockerOptions);

		// Get the nginx configuration from our nitric entrypoints
		const configuration = createNginxConfig(entrypoints);

		// Stage the file...
		await stageStackEntrypoint(stack, configuration);

		// We likely want to buffer this so we can pipe it in as a file to tar-fs
		// We still ahve to stage the configuration as part of the stack somewhere...
		const packStream = tar.pack(stack.getStagingDirectory(), {
			// Grab the nginx configuration from the staging directory
			entries: [NGINX_CONFIG_FILE]
		});

		// Copy sites onto the frontend container
		await Promise.all(stack.getSites().map(async (s) => {
			await Site.build(s);
			const siteTar = tar.pack(s.getAssetPath());

			return await container.putArchive(siteTar, {
				path: `/www/${s.getName()}`,
			});
		}));

		// write the nginx configuration to the default nginx directory
		await container.putArchive(packStream, {
			// Copy nginx.conf to our nginx container
			path: '/etc/nginx/',
		});

		// Start the container...
		await container.start();

		return container;
	}
}
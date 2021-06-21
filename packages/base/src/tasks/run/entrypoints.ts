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

import { NamedObject, NitricEntrypoint, Site, Stack, Task } from '@nitric/cli-common';
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import tar from 'tar-fs';
import fs from 'fs';
import path from 'path';
import getPort from 'get-port';
import streamToPromise from 'stream-to-promise';
import { DOCKER_LABEL_RUN_ID } from '../../constants';

const HTTP_PORT = 80;
const NGINX_CONFIG_FILE = 'nginx.conf';

/**
 * Stage the entrypoint with the stack staging directory
 */
export async function stageStackEntrypoint(stack: Stack, nginxConf: string): Promise<void> {
	// Get the staging directory for the stack
	await fs.promises.mkdir(stack.getStagingDirectory(), { recursive: true });
	const configFile = path.join(stack.getStagingDirectory(), NGINX_CONFIG_FILE);
	await fs.promises.writeFile(configFile, nginxConf);
}

/**
 * Creates a nginx configuration to act as a single host entrypoint
 * For nitric resources
 * @param stack
 */
export function createNginxConfig(entrypoint: NamedObject<NitricEntrypoint>, stack: Stack): string {
	const { entrypoints } = stack.asNitricStack();

	if (!entrypoints) {
		throw new Error('Cannot create nginx config for stack with no entrypoints');
	}

	const paths = Object.keys(entrypoint.paths).map((p) => {
		const path = {
			path: p,
			...entrypoint.paths[p],
		};
		if (!path.target) {
			throw new Error(`Missing target property for path '${path.path}' in entrypoint '${entrypoint.name}'`);
		}
		if (!path.type) {
			throw new Error(`Missing type property for path '${path.path}' in entrypoint '${entrypoint.name}'`);
		}
		return path;
	});

	const sites = paths.filter((e) => e.type === 'site');
	const apis = paths.filter((e) => e.type === 'api');
	const services = paths.filter((e) => e.type === 'service');

	return `
	events {}
	http {
		include mime.types;
		server {
			${sites
				.map(
					(s) => `
				location ${s.path} {
					root /www/${s.target};
				}
			`,
				)
				.join('\n')}

			${apis
				.map(
					(a) => `
				location ${a.path} {
					proxy_pass http://api-${a.target}:8080;
				}
			`,
				)
				.join('\n')}

			${services
				.map(
					(a) => `
				location ${a.path} {
					proxy_pass http://${a.target}:9001;
				}
			`,
				)
				.join('\n')}
		}
	}
	`;
}

/**
 * Options when running entrypoints for local testing
 */
export interface RunEntrypointTaskOptions {
	entrypoint: NamedObject<NitricEntrypoint>;
	stack: Stack;
	network?: Network;
	port?: number;
	runId: string;
}

/**
 * Run local http entrypoint(s) as containers for developments/testing purposes.
 */
export class RunEntrypointTask extends Task<Container> {
	private entrypoint: NamedObject<NitricEntrypoint>;
	private stack: Stack;
	private network?: Network;
	private docker: Docker;
	private port?: number;
	private runId: string;

	constructor({ entrypoint, stack, network, port, runId }: RunEntrypointTaskOptions, docker: Docker) {
		super(`${entrypoint.name} - ${port}`);
		this.entrypoint = entrypoint;
		this.stack = stack;
		this.network = network;
		this.docker = docker;
		this.port = port;
		this.runId = runId;
	}

	async do(): Promise<Container> {
		const { stack, network, docker, runId } = this;

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
		await streamToPromise(await docker.pull('nginx'));

		this.stack.asNitricStack().entrypoints;

		const dockerOptions = {
			name: `entry-${this.entrypoint.name}-${runId}`,
			// Pull nginx
			Image: 'nginx',
			ExposedPorts: {
				[`${HTTP_PORT}/tcp`]: {},
			},
			Volumes: {},
			Labels: {
				[DOCKER_LABEL_RUN_ID]: runId,
			},
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
		const configuration = createNginxConfig(this.entrypoint, stack);

		// Stage the file...
		await stageStackEntrypoint(stack, configuration);

		// We likely want to buffer this so we can pipe it in as a file to tar-fs
		// TODO: We still need to stage the configuration as part of the stack somewhere...
		const packStream = tar.pack(stack.getStagingDirectory(), {
			// Grab the nginx configuration from the staging directory
			entries: [NGINX_CONFIG_FILE],
		});

		// write the nginx configuration to the default nginx directory
		await container.putArchive(packStream, {
			// Copy nginx.conf to our nginx container
			path: '/etc/nginx/',
		});

		// Start the entrypoint container
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

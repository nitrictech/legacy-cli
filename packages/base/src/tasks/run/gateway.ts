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

import { NitricAPI, NamedObject, Task, STAGING_API_DIR } from '@nitric/cli-common';
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import fs from 'fs';
import getPort from 'get-port';
import streamToPromise from 'stream-to-promise';
import tar from 'tar-fs';
import { DOCKER_LABEL_RUN_ID } from '../../constants';

const GATEWAY_PORT = 8080;
const NITRIC_BASE_API_GATEWAY_IMAGE = 'nitricimages/dev-api-gateway';

/**
 * Options when running API Gateways for local testing
 */
export interface RunGatewayTaskOptions {
	stackName: string;
	api: NitricAPI & { name: string };
	port?: number;
	docker: Docker;
	network?: Network;
	runId: string;
}

/**
 * Create a temporary staging directory for API Gateway source builds
 */
export function createAPIStagingDirectory(): string {
	if (!fs.existsSync(`${STAGING_API_DIR}`)) {
		fs.mkdirSync(`${STAGING_API_DIR}`);
	}

	return `${STAGING_API_DIR}`;
}

/**
 * Create a temporary staging directory for a specific API Gateway source build
 */
export function createAPIDirectory(apiName: string): string {
	const stagingDir = createAPIStagingDirectory();
	if (!fs.existsSync(`${stagingDir}/${apiName}`)) {
		fs.mkdirSync(`${stagingDir}/${apiName}`);
	}

	return `${stagingDir}/${apiName}`;
}

/**
 * Run local API Gateways for development/testing
 */
export class RunGatewayTask extends Task<Container> {
	private stackName: string;
	private api: NamedObject<NitricAPI>;
	private port?: number;
	private network?: Network;
	private docker: Docker;
	private runId: string;

	constructor({ stackName, api, port, docker, network, runId }: RunGatewayTaskOptions) {
		super('Creating API Gateways');
		this.stackName = stackName;
		this.api = api;
		this.port = port;
		this.docker = docker;
		this.network = network;
		this.runId = runId;
	}

	async do(): Promise<Container> {
		const { stackName, api, network, runId } = this;

		if (!this.port) {
			this.port = await getPort();
		}

		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network for stack '${stackName}', defaulting to bridge network`);
			}
		}

		// Download the base API Gateway source image
		// note: needed because docker.createContainer doesn't appear to automatically retrieve the base image.
		await streamToPromise(await this.docker.pull(NITRIC_BASE_API_GATEWAY_IMAGE));

		// Build a new image for this specific API Gateway
		const dockerOptions = {
			name: `api-${api.name}-${runId}`,
			// Pull the image from public docker repo
			Image: NITRIC_BASE_API_GATEWAY_IMAGE,
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Volumes: {},
			Labels: {
				[DOCKER_LABEL_RUN_ID]: runId,
			},
			HostConfig: {
				NetworkMode: networkName,
				PortBindings: {
					[`${GATEWAY_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
				},
			},
			NetworkingConfig: {
				EndpointsConfig: {
					[networkName]: {
						Aliases: [`api-${api.name}`],
					},
				},
			},
		} as ContainerCreateOptions;
		const container = await this.docker.createContainer(dockerOptions);

		const { name, ...spec } = api;

		// Create staging dir for the build and add the api spec to be loaded by the gateway server
		const dirName = createAPIDirectory(name);
		fs.writeFileSync(`${dirName}/openapi.json`, JSON.stringify(spec));

		// use tarfs to create a buffer to pipe to put archive...
		const packStream = tar.pack(dirName);

		// Write the open api file to this api gateway source
		await container.putArchive(packStream, {
			path: '/',
		});

		await container.start();

		return container;
	}
}

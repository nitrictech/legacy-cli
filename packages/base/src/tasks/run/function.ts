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

import { Task, NitricImage } from '@nitric/cli-common';
import getPort from 'get-port';
import Docker, { Container, Network, NetworkInspectInfo, ContainerCreateOptions, Volume } from 'dockerode';
import { createNitricLogDir, functionLogFilePath } from '../../utils';
import fs from 'fs';

const GATEWAY_PORT = 9001;

export interface RunServiceTaskOptions {
	image: NitricImage;
	port?: number | undefined;
	subscriptions?: Record<string, string[]>;
	network?: Network;
	volume?: Volume;
}

export class RunServiceTask extends Task<Container> {
	private image: NitricImage;
	private port: number | undefined;
	private docker: Docker;
	private network: Network | undefined;
	private volume: Volume | undefined;
	private subscriptions: Record<string, string[]> | undefined;

	constructor({ image, port, network, subscriptions, volume }: RunServiceTaskOptions, docker?: Docker) {
		super(`${image.serviceName} - ${image.id.substring(0, 12)}`);
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

		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}

		const dockerOptions = {
			name: this.image.serviceName,
			Env: [`LOCAL_SUBSCRIPTIONS=${JSON.stringify(subscriptions)}`],
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Volumes: {},
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
		} as ContainerCreateOptions;

		// Join custom network, if configured
		if (networkName !== 'bridge') {
			dockerOptions['NetworkingConfig'] = {
				EndpointsConfig: {
					[networkName]: {
						Aliases: [this.image.serviceName],
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
				...(dockerOptions['HostConfig'] || {}),
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
			// Only wait 2 seconds for the container.
			const rejectTimeout = setTimeout(() => {
				rej(new Error(`Container for image ${this.image.id} not started after 2 seconds.`));
			}, 2000);

			runResult.on('container', (container: Container) => {
				clearTimeout(rejectTimeout);
				this.update(`Container ${container.id.substring(0, 12)} listening on: ${this.port}`);
				res(container);
			});
		});

		return container;
	}
}

export class Cleanup extends Task<void> {
	async do(): Promise<void> {
		return;
	}
}

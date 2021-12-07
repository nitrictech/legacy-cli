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

import { ContainerImage, Stack, Task } from '@nitric/cli-common';
import getPort from 'get-port';
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import { createNitricLogDir, functionLogFilePath } from '../../utils';
import fs from 'fs';
import { DOCKER_LABEL_RUN_ID } from '../../constants';
import { NITRIC_DEV_VOLUME } from './constants';
import path from 'path';
import { RunContainerResult } from './types';

const GATEWAY_PORT = 9001;

const NITRIC_RUN_DIR = './.nitric/run';
// NOTE: octal notation is important here!!!
const NITRIC_RUN_PERM = 0o777;

/**
 * Options when running local functions/containers for development/testing
 */
export interface RunContainerTaskOptions {
	stack: Stack;
	image: ContainerImage;
	port?: number | undefined;
	subscriptions?: Record<string, string[]>;
	volumes?: Record<string, string>;
	cmd?: string[];
	network?: Network;
	runId: string;
}

/**
 * Run a Nitric Function or Container locally for development or testing
 */
export class RunContainerTask extends Task<RunContainerResult> {
	private stack: Stack;
	private image: ContainerImage;
	private port: number | undefined;
	private docker: Docker;
	private network: Network | undefined;
	private subscriptions: Record<string, string[]> | undefined;
	private runId: string;
	private volumes: Record<string, string>;
	private cmd: string[] | undefined;

	constructor(
		{ stack, image, port, network, subscriptions, runId, volumes = {}, cmd }: RunContainerTaskOptions,
		docker?: Docker,
	) {
		super(`${image.name} - ${image.id.substring(0, 12)}`);
		this.stack = stack;
		this.image = image;
		this.port = port;
		this.docker = docker || new Docker();
		this.network = network;
		this.subscriptions = subscriptions;
		this.runId = runId;
		this.volumes = volumes;
		this.cmd = cmd;
	}

	async do(): Promise<RunContainerResult> {
		const { network, subscriptions, runId } = this;

		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		// If available, use the custom network for this func
		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}

		const dotEnv = path.join(this.stack.getDirectory(), '.env');
		const envArr = fs.existsSync(dotEnv) ? fs.readFileSync(dotEnv, 'utf8').split('\n') : [];

		const dockerOptions = {
			name: `${this.image.name}-${runId}`,
			Env: [
				`LOCAL_SUBSCRIPTIONS=${JSON.stringify(subscriptions)}`,
				`NITRIC_DEV_VOLUME=${NITRIC_DEV_VOLUME}`,
				// ENV variables to connect the membrane to a local minio instance
				`MINIO_ENDPOINT=http://minio-${runId}:9000`,
				// TODO: Update these from defaults
				`MINIO_ACCESS_KEY=minioadmin`,
				`MINIO_SECRET_KEY=minioadmin`,
				...envArr,
			],
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Volumes: {},
			Cmd: this.cmd,
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
		} as ContainerCreateOptions;

		// Join custom network, if configured
		if (networkName !== 'bridge') {
			dockerOptions['NetworkingConfig'] = {
				EndpointsConfig: {
					[networkName]: {
						Aliases: [this.image.name],
					},
				},
			};
		}

		const nitricRunDir = path.join(this.stack.getDirectory(), NITRIC_RUN_DIR);

		fs.mkdirSync(nitricRunDir, { recursive: true });
		fs.chmodSync(nitricRunDir, NITRIC_RUN_PERM);

		// Add storage volume, if configured
		const MOUNT_POINT = NITRIC_DEV_VOLUME;
		dockerOptions['Volumes'] = {
			[MOUNT_POINT]: {},
			...Object.keys(this.volumes).reduce((acc, v) => ({ ...acc, [v]: {} }), {}),
		};
		dockerOptions['HostConfig'] = {
			...(dockerOptions['HostConfig'] || {}),
			Mounts: [
				{
					Target: MOUNT_POINT,
					Source: nitricRunDir, // volume.name,
					Type: 'bind',
				},
				...Object.entries(this.volumes).map(([Target, Source]) => ({
					Target,
					Source,
					Type: 'bind' as any,
				})),
			],
		};

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
					console.log(`${this.name} exited with status code: ${data.StatusCode}`);
				}
			},
		);

		return await new Promise((res, rej) => {
			// Only wait 2 seconds for the source.
			const rejectTimeout = setTimeout(() => {
				rej(new Error(`Container for image ${this.image.id} not started after 2 seconds.`));
			}, 2000);

			runResult.on('container', (container: Container) => {
				clearTimeout(rejectTimeout);
				this.update(`Container ${container.id.substring(0, 12)} listening on: ${this.port}`);
				res({
					name: this.image.name,
					type: 'container',
					container,
					ports: [this.port!],
				});
			});
		});
	}
}

export class Cleanup extends Task<void> {
	async do(): Promise<void> {
		return;
	}
}

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

import { NamedObject, NitricBucket, Stack, Task } from '@nitric/cli-common';
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from 'dockerode';
import fs from 'fs';
import path from 'path';
import getPort from 'get-port';
import streamToPromise from 'stream-to-promise';
import { DOCKER_LABEL_RUN_ID } from '../../constants';
import { NITRIC_RUN_DIR, NITRIC_RUN_PERM, NITRIC_DEV_VOLUME } from './constants';

const MINIO_PORT = 9000;
// TODO: Determine if we would like to expose the console
const MINIO_CONSOLE_PORT = 9001;

/**
 * Starts an exec stream and Wraps the docker.modem.followProgress function on non-windows platforms
 * For windows a workaround using exec.inspect is used to ensure we can capture the end of the stream
 * @param exec
 * @param docker
 */
//export async function execStream(exec: Docker.Exec, docker: Docker): Promise<void> {
//	const execStream = await exec.start({});

//	await new Promise<void>((resolve) => {
//		if (os.platform() == 'win32') {
//			let output = '';
//			execStream.on('data', (chunk) => (output += chunk));

//			const interval = setInterval(async () => {
//				const { Running } = await exec.inspect();

//				if (!Running) {
//					clearInterval(interval);
//					execStream.destroy();
//					resolve();
//				}
//			}, 100);
//		} else {
//			docker.modem.followProgress(execStream, resolve);
//		}
//	});
//}

/**
 * Options when running entrypoints for local testing
 */
export interface RunStorageServiceTaskOptions {
	stack: Stack;
	buckets: NamedObject<NitricBucket>[];
	network?: Network;
	port?: number;
	consolePort?: number;
	runId: string;
}

/**
 * Run local http entrypoint(s) as containers for developments/testing purposes.
 */
export class RunStorageServiceTask extends Task<Container> {
	private stack: Stack;
	private buckets: NamedObject<NitricBucket>[];
	private network?: Network;
	private docker: Docker;
	private port?: number;
	private consolePort?: number;
	private runId: string;

	constructor({ stack, buckets, network, port, consolePort, runId }: RunStorageServiceTaskOptions, docker: Docker) {
		super(`minio server`);
		this.stack = stack;
		this.buckets = buckets;
		this.network = network;
		this.docker = docker;
		this.port = port;
		this.consolePort = consolePort;
		this.runId = runId;
	}

	async do(): Promise<Container> {
		const { buckets, network, docker, runId } = this;

		if (!this.port) {
			// Find any open port if none provided.
			this.port = await getPort();
		}

		if (!this.consolePort) {
			this.consolePort = await getPort();
		}

		let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}

		// Ensure the buckets directory exists
		const nitricRunDir = path.join(this.stack.getDirectory(), NITRIC_RUN_DIR);
		fs.mkdirSync(nitricRunDir, { recursive: true });
		fs.chmodSync(nitricRunDir, NITRIC_RUN_PERM);
		await Promise.all(
			buckets.map((b) => fs.promises.mkdir(path.join(nitricRunDir, `./buckets/${b.name}`), { recursive: true })),
		);

		// Add storage volume, if configured
		const MOUNT_POINT = `${NITRIC_DEV_VOLUME}`;

		// Pull nginx
		await streamToPromise(await docker.pull('minio/minio'));

		const dockerOptions = {
			name: `minio-${runId}`,
			// Pull nginx
			Image: 'minio/minio',
			ExposedPorts: {
				[`${MINIO_PORT}/tcp`]: {},
				[`${MINIO_CONSOLE_PORT}/tcp`]: {},
			},
			Volumes: {
				[MOUNT_POINT]: {},
			},
			Labels: {
				[DOCKER_LABEL_RUN_ID]: runId,
			},
			Cmd: ['server', '/nitric/buckets', '--console-address', `:${MINIO_CONSOLE_PORT}`],
			HostConfig: {
				NetworkMode: networkName,
				PortBindings: {
					[`${MINIO_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
					[`${MINIO_CONSOLE_PORT}/tcp`]: [
						{
							HostPort: `${this.consolePort}/tcp`,
						},
					],
				},
				Mounts: [
					{
						Target: MOUNT_POINT,
						Source: nitricRunDir, // volume.name,
						Type: 'bind',
					},
				],
			},
		} as ContainerCreateOptions;

		// Create the nginx source first
		const container = await docker.createContainer(dockerOptions);

		// Start the entrypoint source
		await container.start();

		return container;
	}
}

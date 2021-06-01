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

import tar from 'tar-fs';
import { dockerodeEvtToString, NitricImage, Task, STAGING_DIR, Service, Stack, Template } from '@nitric/cli-common';
import Docker from 'dockerode';
import path from 'path';
import rimraf from 'rimraf';

interface BuildServiceTaskOptions {
	stack: Stack;
	baseDir: string;
	service: Service;
	provider?: string;
}

export class BuildServiceTask extends Task<NitricImage> {
	private service: Service;
	private readonly stack: Stack;
	private readonly provider: string;

	constructor({ service, stack, provider = 'local' }: BuildServiceTaskOptions) {
		super(`${service.getName()}`);
		this.service = service;
		this.stack = stack;
		this.provider = provider;
	}

	async do(): Promise<NitricImage> {
		const docker = new Docker();
		// temporarily copy to template runtime into the users code directory
		// FIXME: Currently dockerode does not support dockerfiles specified outsode of build context\
		const runtimeStagingDirectory = path.join(this.service.getDirectory(), './.nitric/')
		const template = await this.stack.getTemplate(this.service.asNitricService().runtime);
		await Template.copyRuntimeTo(template, runtimeStagingDirectory);

		try {
			const pack = tar.pack(this.service.getDirectory());
			const dockerfile = './.nitric/Dockerfile';
			//throw new Error(dockerfile);

			const options = {
				buildargs: {
					PROVIDER: this.provider,
				},
				t: this.service.getImageTagName(this.provider),
				shmsize: 1000000000,
				dockerfile,
			};

			let stream: NodeJS.ReadableStream;
			try {
				stream = await docker.buildImage(pack, options);
			} catch (error) {
				if (error.errno && error.errno === -61) {
					throw new Error('Unable to connect to docker, is it running locally?');
				}
				throw error;
			}

			// Get build updates
			const buildResults = await new Promise<any[]>((resolve, reject) => {
				docker.modem.followProgress(
					stream,
					(errorInner: Error, resolveInner: Record<string, any>[]) =>
						errorInner ? reject(errorInner) : resolve(resolveInner),
					(event: any) => {
						try {
							this.update(dockerodeEvtToString(event));
						} catch (error) {
							reject(new Error(error.message.replace(/\n/g, '')));
						}
					},
				);
			});

			const filteredResults = buildResults.filter((obj) => 'aux' in obj && 'ID' in obj['aux']);
			if (filteredResults.length > 0) {
				const imageId = filteredResults[filteredResults.length - 1]['aux'].ID.split(':').pop() as string;
				return { id: imageId, serviceName: this.service.getName() } as NitricImage;
			} else {
				const {
					errorDetail: { message },
				} = buildResults.pop() as any;
				throw new Error(message);
			}
		} finally {
			rimraf.sync(runtimeStagingDirectory);
		}
	}

}

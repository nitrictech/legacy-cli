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

// import execa from 'execa';
// import { oneLine } from 'common-tags';
import { Task } from './task';
import { ContainerImage } from '../types';
import { Container } from '../stack';
import { dockerodeEvtToString } from '../index';
// import rimraf from 'rimraf';

import tar from 'tar-fs';
import Docker from 'dockerode';

interface BuildContainerTaskOptions {
	baseDir: string;
	container: Container;
	provider?: string;
}

export class BuildContainerTask extends Task<ContainerImage> {
	private container: Container;
	// private readonly stack: Stack;
	private readonly provider: string;

	constructor({ container, provider = 'local' }: BuildContainerTaskOptions) {
		super(`${container.getName()}`);
		this.container = container;
		// this.stack = stack;
		this.provider = provider;
	}

	async do(): Promise<ContainerImage> {
		const docker = new Docker();

		// const ignoreFiles = await Template.getDockerIgnoreFiles(template);

		const pack = tar.pack(this.container.getContext(), {
			// TODO: support ignore again
			// ignore: (name) =>
			// 	// Simple filter before more complex multimatch
			// 	ignoreFiles.filter((f) => name.includes(f)).length > 0 || match(name, ignoreFiles).length > 0,
		});

		// FIXME: Currently dockerode does not support dockerfiles specified outside of build context
		const dockerfile = this.container.getDockerfile();

		const options = {
			buildargs: {
				PROVIDER: this.provider,
			},
			t: this.container.getImageTagName(this.provider),
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
			return { id: imageId, name: this.container.getName() } as ContainerImage;
		} else {
			const {
				errorDetail: { message },
			} = buildResults.pop() as any;
			throw new Error(message);
		}
	}
}

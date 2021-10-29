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

import { Task } from './task';
import { ContainerImage } from '../types';
import { StackContainer } from '../stack';
import { oneLine } from 'common-tags';
import execa from 'execa';

interface BuildContainerTaskOptions {
	baseDir: string;
	container: StackContainer;
	provider?: string;
}

export class BuildContainerTask extends Task<ContainerImage> {
	private container: StackContainer;
	private readonly provider: string;

	constructor({ container, provider = 'local' }: BuildContainerTaskOptions) {
		super(`${container.getName()}`);
		this.container = container;
		this.provider = provider;
	}

	async do(): Promise<ContainerImage> {
		const imageId = this.container.getImageTagName(this.provider);
		const { args = {} } = this.container.getDescriptor();

		const cmd = oneLine`
			docker build ${this.container.getContext()} 
			-f ${this.container.getDockerfile()}
			-t ${imageId}
			--progress plain
			--build-arg PROVIDER=${this.provider}
			${Object.keys(args)
				.map((k) => `--build-arg ${k}=${args[k]}`)
				.join(' ')}
		`;

		try {
			const dockerProcess = execa.command(cmd, {
				// Enable buildkit for out of context dockerfile
				env: {
					DOCKER_BUILDKIT: '1',
				},
			});

			// Only outputs on stderr
			dockerProcess.stderr.on('data', (data) => {
				// fs.writeFileSync('debug.txt', data);
				this.update(data.toString());
			});

			// wait for the process to finalize
			await dockerProcess;
		} catch (e) {
			throw new Error(e.message);
		}

		return {
			id: imageId,
			name: this.container.getName(),
		};
	}
}

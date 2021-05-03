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
import {
	dockerodeEvtToString,
	NitricFunction,
	NitricImage,
	Task,
	getTagNameForFunction,
	STAGING_DIR,
} from '@nitric/cli-common';
import Docker from 'dockerode';
import path from 'path';

interface BuildFunctionTaskOptions {
	stackName: string;
	baseDir: string;
	func: NitricFunction;
	provider?: string;
}

export class BuildFunctionTask extends Task<NitricImage> {
	private func: NitricFunction;
	private stackName: string;
	private provider: string;

	constructor({ func, stackName, provider = 'local' }: BuildFunctionTaskOptions) {
		super(`${func.name}`);
		this.func = func;
		this.stackName = stackName;
		this.provider = provider;
	}

	async do(): Promise<NitricImage> {
		const docker = new Docker();
		const functionStagingDirectory = path.join(STAGING_DIR, this.stackName, this.func.name);
		// Tarball the required files for the image build
		const pack = tar.pack(functionStagingDirectory);

		const options = {
			buildargs: {
				PROVIDER: this.provider,
			},
			t: getTagNameForFunction(this.stackName, this.provider, this.func),
			shmsize: 1000000000,
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
			return { id: imageId, func: this.func } as NitricImage;
		} else {
			const {
				errorDetail: { message },
			} = buildResults.pop() as any;
			throw new Error(message);
		}
	}
}

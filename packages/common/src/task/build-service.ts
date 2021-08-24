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

import execa from 'execa';
import { oneLine } from 'common-tags';
import { Task } from './task';
import { NitricImage } from '../types';
import { Service } from '../stack';

interface BuildServiceTaskOptions {
	baseDir: string;
	service: Service;
	provider?: string;
}

const PACK_IMAGE = 'buildpacksio/pack:0.13.1';
const BUILDER_IMAGE = 'nitrictech/bp-builder-base';

export class BuildServiceTask extends Task<NitricImage> {
	private service: Service;
	private readonly provider: string;

	constructor({ service, provider = 'local' }: BuildServiceTaskOptions) {
		super(`${service.getName()}`);
		this.service = service;
		this.provider = provider;
	}

	async do(): Promise<NitricImage> {
		const imageId = this.service.getImageTagName(this.provider);

		// Run docker
		// TODO: This will need to be updated for mono repo support
		// FIXME: Need to confirm docker sock mounting will work on windows
		try {
			const packProcess = execa.command(oneLine`
				docker run
					--privileged=true
					-v /var/run/docker.sock:/var/run/docker.sock
					-v ${this.service.getContext()}:/workspace -w /workspace
					${PACK_IMAGE} build ${imageId} 
					--builder ${BUILDER_IMAGE}
					${Object.entries(this.service.getPackEnv())
						.map(([k, v]) => `--env ${k}=${v}`)
						.join(' ')}
					--env BP_MEMBRANE_PROVIDER=${this.provider}
					--default-process membrane
			`);

			// pipe build to stdout
			packProcess.stdout.on('data', (data) => {
				this.update(data.toString());
			});

			// wait for the process to finalize
			await packProcess;
		} catch (e) {
			throw new Error(e.message);
		}

		return {
			id: imageId,
			serviceName: this.service.getName(),
		};
	}
}

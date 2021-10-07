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
import { ContainerImage } from '../types';
import { StackFunction } from '../stack';
import which from 'which';

interface BuildFunctionTaskOptions {
	baseDir: string;
	func: StackFunction;
	provider?: string;
}

const PACK_IMAGE = 'buildpacksio/pack:0.13.1';
const BUILDER_IMAGE = 'nitrictech/bp-builder-base';

export class BuildFunctionTask extends Task<ContainerImage> {
	private service: StackFunction;
	private readonly provider: string;

	constructor({ func, provider = 'local' }: BuildFunctionTaskOptions) {
		super(`${func.getName()}`);
		this.service = func;
		this.provider = provider;
	}

	async do(): Promise<ContainerImage> {
		const imageId = this.service.getImageTagName(this.provider);

		let baseCmd = oneLine`
			build ${imageId} 
			--builder ${BUILDER_IMAGE}
			${Object.entries(this.service.getPackEnv())
				.map(([k, v]) => `--env ${k}=${v}`)
				.join(' ')}
            --env BP_MEMBRANE_VERSION=${this.service.getVersion()}
			--env BP_MEMBRANE_PROVIDER=${this.provider}
			--env BP_NITRIC_SERVICE_HANDLER=${this.service.getContextRelativeDirectory()}
			--pull-policy if-not-present
			--default-process membrane
		`;

		const packInstalled = which.sync('pack', { nothrow: true });

		if (!packInstalled) {
			baseCmd = oneLine`
				docker run
				--rm
				--privileged=true
				-v /var/run/docker.sock:/var/run/docker.sock
				-v ${this.service.getContext()}:/workspace -w /workspace
				${PACK_IMAGE} ${baseCmd}
			`;
		} else {
			baseCmd = oneLine`pack ${baseCmd}`;
		}

		// Run docker
		// TODO: This will need to be updated for mono repo support
		// FIXME: Need to confirm docker sock mounting will work on windows
		try {
			const packProcess = execa.command(baseCmd);

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
			name: this.service.getName(),
		};
	}
}

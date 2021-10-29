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
import path from 'path';
import { oneLine } from 'common-tags';
import { Task } from './task';
import { ContainerImage } from '../types';
import { StackFunction } from '../stack';
import { DEFAULT_NITRIC_DIR, DEFAULT_BUILD_DIR } from '../constants';
import which from 'which';
import TOML from '@iarna/toml';
import fs from 'fs';

interface BuildFunctionTaskOptions {
	baseDir: string;
	func: StackFunction;
	provider?: string;
}

const PACK_IMAGE = 'buildpacksio/pack:0.21.1';
const BUILDER_IMAGE = 'nitrictech/bp-builder-base';

const DEFAULT_PROJECT_CONFIG = {
	build: {
		exclude: [DEFAULT_NITRIC_DIR],
	},
};

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

		// Create a temporary default ignore file
		// and delete it when we're done
		const contextDirectory = this.service.getDescriptor().context || '.';
		const contextBuildDirectory = `./${path.join(contextDirectory, DEFAULT_BUILD_DIR)}`;

		await fs.promises.mkdir(contextBuildDirectory, {
			recursive: true,
		});
		await fs.promises.writeFile(`./${contextBuildDirectory}/${imageId}.toml`, TOML.stringify(DEFAULT_PROJECT_CONFIG));

		let baseCmd = oneLine`
			build ${imageId} 
			--builder ${BUILDER_IMAGE}
			--trust-builder
			${Object.entries(this.service.getPackEnv())
				.map(([k, v]) => `--env ${k}=${v}`)
				.join(' ')}
			-d ./.nitric/build/${imageId}.toml
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
				-u root
				-v /var/run/docker.sock:/var/run/docker.sock
				-v ${this.service.getContext()}:/workspace -w /workspace
				${PACK_IMAGE} ${baseCmd}
			`;
		} else {
			baseCmd = oneLine`pack ${baseCmd} --path ${this.service.getContext()}`;
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

			// clean build files
			await fs.promises.unlink(`./${contextBuildDirectory}/${imageId}.toml`);

			// remove build directory if empty
			if (fs.existsSync(contextBuildDirectory) && fs.readdirSync(contextBuildDirectory).length === 0) {
				await fs.promises.rmdir(contextBuildDirectory);
			}
		} catch (e) {
			throw new Error(e.message);
		}

		return {
			id: imageId,
			name: this.service.getName(),
		};
	}
}

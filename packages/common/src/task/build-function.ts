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

//import execa from 'execa';
//import path from 'path';
//import { oneLine } from 'common-tags';
import { Task } from './task';
import { ContainerImage } from '../types';
import { StackFunction } from '../stack';
//import { DEFAULT_NITRIC_DIR, DEFAULT_BUILD_DIR } from '../constants';
//import which from 'which';
//import TOML from '@iarna/toml';
//import fs from 'fs';
import { Workspace } from '@nitric/boxygen';
import {
	buildGoApp,
	buildGoFinal,
	baseTsFunction,
	configureTsFunction,
	installMembrane,
	TS_IGNORE,
	python,
	PYTHON_IGNORE,
	mavenBuild,
	MAVEN_IGNORE,
	javaFinal,
	javascript,
	JS_IGNORE,
} from '../boxygen';

interface BuildFunctionTaskOptions {
	baseDir: string;
	func: StackFunction;
	provider?: string;
}

//const PACK_IMAGE = 'buildpacksio/pack:0.21.1';
//const BUILDER_IMAGE = 'nitrictech/bp-builder-base';

//const DEFAULT_PROJECT_CONFIG = {
//	build: {
//		exclude: [DEFAULT_NITRIC_DIR],
//	},
//};

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
		const descriptor = this.service.getDescriptor();
		const update = this.update.bind(this);

		await Workspace.start(
			async (wkspc) => {
				if (descriptor.handler.endsWith('.js')) {
					await wkspc.image('node:alpine', { ignore: JS_IGNORE }).apply(javascript(descriptor.handler)).commit(imageId);
				} else if (descriptor.handler.endsWith('.ts')) {
					// we have a typescript function
					await wkspc
						.image('node:alpine', { ignore: TS_IGNORE })
						.apply(baseTsFunction)
						.apply(installMembrane(this.provider, descriptor.version || 'latest'))
						.apply(configureTsFunction(this.service.getDescriptor().handler))
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.go')) {
					// we have a golang function
					const baseImage = await wkspc
						.image('golang:alpine')
						.apply(buildGoApp(this.service.getDescriptor().handler, '/bin/main'))
						.stage();

					await wkspc
						.image('alpine', { as: `${this.service.getName()}` })
						.apply(installMembrane(this.provider, descriptor.version || 'latest'))
						.apply(buildGoFinal(baseImage, '/bin/main'))
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.py')) {
					// we have a python function
					await wkspc
						.image('python:3.7-slim', { ignore: PYTHON_IGNORE })
						.apply(python(descriptor.handler))
						.apply(installMembrane(this.provider, descriptor.version || 'latest'))
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.jar')) {
					// we have a Java function
					// TODO: Support additional build systems by checking workspace contents
					const javaBase = await wkspc.image('maven:3-openjdk-11', { ignore: MAVEN_IGNORE }).apply(mavenBuild).stage();

					// TODO: Support AppCDS stage for faster warmup

					await wkspc
						.image('adoptopenjdk/openjdk11:x86_64-alpine-jre-11.0.10_9')
						.apply(javaFinal(descriptor.handler, javaBase))
						.apply(installMembrane(this.provider, descriptor.version || 'latest'))
						.commit(imageId);
				}
			},
			{
				context: this.service.getContext(),
				logger: (lines: string[]) => {
					update(lines.join('\n'));
				},
			},
		);

		// Create a temporary default ignore file
		// and delete it when we're done
		//const contextDirectory = this.service.getDescriptor().context || '.';
		//const contextBuildDirectory = `./${path.join(contextDirectory, DEFAULT_BUILD_DIR)}`;

		//await fs.promises.mkdir(contextBuildDirectory, {
		//	recursive: true,
		//});
		//await fs.promises.writeFile(`./${contextBuildDirectory}/${imageId}.toml`, TOML.stringify(DEFAULT_PROJECT_CONFIG));

		//let baseCmd = oneLine`
		//	build ${imageId}
		//	--builder ${BUILDER_IMAGE}
		//	--trust-builder
		//	${Object.entries(this.service.getPackEnv())
		//		.map(([k, v]) => `--env ${k}=${v}`)
		//		.join(' ')}
		//	-d ./.nitric/build/${imageId}.toml
		//	--env BP_MEMBRANE_VERSION=${this.service.getVersion()}
		//	--env BP_MEMBRANE_PROVIDER=${this.provider}
		//	--env BP_NITRIC_SERVICE_HANDLER=${this.service.getContextRelativeDirectory()}
		//	--pull-policy if-not-present
		//	--default-process membrane
		//`;

		//const packInstalled = which.sync('pack', { nothrow: true });

		//if (!packInstalled) {
		//	baseCmd = oneLine`
		//		docker run
		//		--rm
		//		--privileged=true
		//		-u root
		//		-v /var/run/docker.sock:/var/run/docker.sock
		//		-v ${this.service.getContext()}:/workspace -w /workspace
		//		${PACK_IMAGE} ${baseCmd}
		//	`;
		//} else {
		//	baseCmd = oneLine`pack ${baseCmd} --path ${this.service.getContext()}`;
		//}

		//// Run docker
		//// TODO: This will need to be updated for mono repo support
		//// FIXME: Need to confirm docker sock mounting will work on windows
		//try {
		//	const packProcess = execa.command(baseCmd);

		//	// pipe build to stdout
		//	packProcess.stdout.on('data', (data) => {
		//		this.update(data.toString());
		//	});

		//	// wait for the process to finalize
		//	await packProcess;

		//	// clean build files
		//	await fs.promises.unlink(`./${contextBuildDirectory}/${imageId}.toml`);

		//	// remove build directory if empty
		//	if (fs.existsSync(contextBuildDirectory) && fs.readdirSync(contextBuildDirectory).length === 0) {
		//		await fs.promises.rmdir(contextBuildDirectory);
		//	}
		//} catch (e) {
		//	throw new Error(e.message);
		//}

		return {
			id: imageId,
			name: this.service.getName(),
		};
	}
}

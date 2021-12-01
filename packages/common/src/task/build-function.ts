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
import { StackFunction } from '../stack';
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
	MAVEN_BASE,
	JVM_RUNTIME_BASE,
	javaRuntime,
	javascript,
	JS_IGNORE,
} from '../boxygen';

interface BuildFunctionTaskOptions {
	baseDir: string;
	func: StackFunction;
	provider?: string;
}

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
		const membraneInstall = installMembrane(this.provider, descriptor.version);
		const excludes = descriptor.excludes || [];

		await Workspace.start(
			async (wkspc) => {
				if (descriptor.handler.endsWith('.js')) {
					await wkspc.image('node:alpine', { ignore: JS_IGNORE }).apply(javascript(descriptor.handler)).commit(imageId);
				} else if (descriptor.handler.endsWith('.ts')) {
					// we have a typescript function
					await wkspc
						.image('node:alpine', { ignore: [...excludes, ...TS_IGNORE] })
						.apply(baseTsFunction)
						.apply(membraneInstall)
						.apply(configureTsFunction(this.service.getDescriptor().handler))
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.go')) {
					// we have a golang function
					const baseImage = await wkspc
						.image('golang:alpine')
						.apply(buildGoApp(this.service.getDescriptor().handler, '/bin/main'))
						.stage();

					await wkspc
						.image('alpine', { as: `${this.service.getName()}`, ignore: excludes })
						.apply(membraneInstall)
						.apply(buildGoFinal(baseImage, '/bin/main'))
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.py')) {
					// we have a python function
					await wkspc
						.image('python:3.7-slim', { ignore: [...excludes, ...PYTHON_IGNORE] })
						.apply(python(descriptor.handler))
						.apply(membraneInstall)
						.commit(imageId);
				} else if (descriptor.handler.endsWith('.jar')) {
					// we have a Java function
					// TODO: Support additional build systems by checking workspace contents
					const javaBase = await wkspc.image(MAVEN_BASE, { ignore: excludes }).apply(mavenBuild).stage();

					// TODO: Support AppCDS stage for faster warmup

					await wkspc
						.image(JVM_RUNTIME_BASE)
						.apply(javaRuntime(descriptor.handler, javaBase))
						.apply(membraneInstall)
						.commit(imageId);
				}
			},
			{
				timeout: 30000,
				context: this.service.getContext(),
				version: 'v0.0.1-rc.3',
				logger: (lines: string[]) => {
					update(lines.join('\n'));
				},
			},
		);

		return {
			id: imageId,
			name: this.service.getName(),
		};
	}
}

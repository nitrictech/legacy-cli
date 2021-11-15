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

		return {
			id: imageId,
			name: this.service.getName(),
		};
	}
}

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

import { Stack, Task, Template } from '@nitric/cli-common';
import path from 'path';
import { pullTemplate } from '../../utils';

interface MakeServiceTaskOpts {
	template: string;
	dir?: string;
	file?: string;
	initialService?: boolean;
	name: string;
}

export class MakeServiceTask extends Task<void> {
	public readonly serviceName: string;
	public readonly template: string;
	public readonly file: string;
	public readonly dir: string;
	public readonly initialService?: boolean;

	constructor({ template, name, file = './nitric.yaml', dir, initialService }: MakeServiceTaskOpts) {
		super(`Making Service ${name}`);
		this.template = template;
		this.serviceName = name;
		this.file = file; // nitric file
		//TODO: refactor normalizeServiceName

		this.dir = dir || name; // new service directory, relative to nitric file.
		this.initialService = initialService;
	}

	/**
	 * Make a new service directory in the project, containing the code scaffold from the chosen template
	 */
	private async makeService(stack: Stack): Promise<void> {
		const template = await stack.getTemplate(this.template);
		this.update(`${this.template} template available in stack`);

		// Scaffold the new service using the code from the template
		await Template.copyTemplateTo(
			template,
			// if initial service don't try and find the relative path as current working directory will be outside of project
			this.initialService ? this.dir : path.relative(process.cwd(), path.join(stack.getDirectory(), this.dir)),
		);
	}

	async do(): Promise<void> {
		this.update('Checking stack descriptor');
		const nitricFile = this.file;
		const stack = await Stack.fromFile(nitricFile);

		await pullTemplate(stack, this.template);

		this.update('Start Make');
		const nitricProjectDirectory = path.dirname(nitricFile);

		stack.addService(this.serviceName, {
			path: path.relative(nitricProjectDirectory, this.dir),
			runtime: this.template,
		});

		this.update('Scaffolding template code');
		await this.makeService(stack);

		this.update(`Updating ${this.file}`);
		await Stack.write(stack);

		this.update(`Updated ${this.file}`);
	}
}

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

// import { templateFunctionPath } from '../../common/paths';
import { Stack, Task, Repository, Template } from '@nitric/cli-common';
import path from 'path';

interface MakeFunctionTaskOpts {
	template: string;
	dir?: string;
	file?: string;
	name: string;
}

export class MakeFunctionTask extends Task<void> {
	public readonly functionName: string;
	public readonly template: string;
	public readonly file: string;
	public readonly dir: string;

	constructor({ template, name, file = './nitric.yaml', dir }: MakeFunctionTaskOpts) {
		super(`Making Function ${name}`);
		this.template = template;
		this.functionName = name;
		this.file = file; // nitric file
		//TODO: refactor normalizeFunctionName
		this.dir = dir || name; // new function directory, relative to nitric file.
	}

	/**
	 * Make a new function directory in the project, containing the code scaffold from the chosen template
	 */
	private async makeFunction(): Promise<void> {
		const repos = Repository.fromDefaultDirectory();
		const [repoName, templateName] = this.template.split('/');
		const repo = repos.find((repo) => repo.getName() === repoName);

		if (!repo) {
			throw new Error(`Repository ${repoName} is not available`);
		}
		const template = repo.getTemplate(templateName);
		this.update(`${this.template} template available locally`);

		// Scaffold the new function using the code from the template
		await Template.copyCodeTo(template, this.dir);
	}

	async do(): Promise<void> {
		this.update('Checking stack descriptor');
		const nitricFile = this.file;
		const stack = await Stack.fromFile(nitricFile);

		this.update('Start Make');
		const nitricProjectDirectory = path.dirname(nitricFile);

		stack.addFunction({
			name: this.functionName,
			path: path.relative(nitricProjectDirectory, this.dir),
			runtime: this.template,
		});

		this.update('Scaffolding function code');
		await this.makeFunction();

		this.update(`Updating ${this.file}`);
		await Stack.write(stack);

		this.update(`Updated ${this.file}`);
	}
}

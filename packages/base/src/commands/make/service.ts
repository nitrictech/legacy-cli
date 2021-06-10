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

import { flags } from '@oclif/command';
import { wrapTaskForListr, Repository, BaseCommand } from '@nitric/cli-common';
import { MakeServiceTask } from '../../tasks';
import { Listr } from 'listr2';
import inquirer from 'inquirer';

interface MakeServiceArgs {
	template: string;
	name: string;
}

export default class Service extends BaseCommand {
	static description = 'Adds a new service to a project';

	static examples = ['$ nitric make:service'];

	static flags = {
		...BaseCommand.flags,
		directory: flags.string({
			char: 'd',
			description: 'Directory within the project where the new service should be made',
		}),
		file: flags.string({
			char: 'f',
			description: 'Project stack definition file (e.g. nitric.yaml)',
		}),
	};

	static args = [
		{
			name: 'template',
			required: false,
			description: 'Service template',
			// TODO: Handle case where no templates are available. Prompt to install template(s).
			// Present available templates from locally installed repositories
			choices: (): string[] => {
				const repos = Repository.fromDefaultDirectory();

				if (repos.length === 0) {
					throw new Error('No repositories available, try running nitric templates:repos:add');
				}

				return Repository.availableTemplates(repos);
			},
		},
		{
			name: 'name',
			required: false,
			description: 'Service name',
		},
	];

	async do(): Promise<void> {
		const { args, flags } = this.parse(Service);

		// Prompt for args that weren't provided
		const prompts = Service.args
			.filter((arg) => !args[arg.name])
			.map((arg) => {
				const prompt = {
					name: arg.name,
					message: arg.description,
					type: 'string',
				};
				if (arg.choices) {
					prompt.type = 'list';
					prompt['choices'] = arg.choices();
				}
				return prompt;
			});

		const promptArgs = await inquirer.prompt(prompts);
		const { template, name } = { ...args, ...promptArgs } as MakeServiceArgs;
		const { directory = `./${name}`, file = './nitric.yaml' } = flags;

		// Normalize service name to lower kebab case
		const serviceName = (name as string)
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^-a-z\d]/g, '');

		await new Listr([
			wrapTaskForListr(
				new MakeServiceTask({
					template,
					dir: directory,
					name: serviceName,
					file,
				}),
			),
		]).run();
	}
}

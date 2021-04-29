// Copyright 2021, Nitric Pty Ltd.
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

import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Repository } from '@nitric/cli-common';
import { MakeFunctionTask } from '../../tasks/make';
import { Listr } from 'listr2';
import inquirer from 'inquirer';

interface MakeFunctionArgs {
	template: string;
	name: string;
}

export default class Function extends Command {
	static description = 'Builds a nitric function';

	static examples = ['$ nitric make:function .'];

	static flags = {
		help: flags.help({ char: 'h' }),
		directory: flags.string({
			char: 'd',
			description: 'directory where the new function should be made',
		}),
		file: flags.string({
			char: 'f',
			description: 'nitric project YAML file',
		}),
		template: flags.string({
			char: 't',
			description: 'template to use',
		}),
	};

	static args = [
		{
			name: 'template',
			required: false,
			description: 'Function template',
			// TODO: Handle case where no templates are available. Prompt to install template(s).
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
			description: 'Function name',
		},
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(Function);
		// Prompt for any args that weren't provided in the command
		const prompts = Function.args
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
		const { template, name } = { ...args, ...promptArgs } as MakeFunctionArgs;
		const { directory = `./${name}`, file = './nitric.yaml' } = flags;

		const functionName = (name as string)
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^-a-z\d]/g, '');

		await new Listr([
			wrapTaskForListr(
				new MakeFunctionTask({
					template,
					dir: directory,
					name: functionName,
					file,
				}),
			),
		]).run();
	}
}

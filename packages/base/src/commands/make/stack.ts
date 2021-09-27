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
import { BaseCommand, Repository, wrapTaskForListr } from '@nitric/cli-common';
import { MakeStackTask } from '../../tasks';
import { Listr } from 'listr2';
import inquirer from 'inquirer';

const projectNameRegex = /^[a-z]+(-[a-z]+)*$/g;

interface MakeStackArgs {
	name: string;
	template: string;
}

/**
 * Command to create a new Nitric Stack.
 *
 * Stacks represent a group of related inter-dependent resources that are built and deployed together.
 */
export default class Stack extends BaseCommand {
	static description = 'Creates a new Nitric stack';

	static examples = [`$ nitric make:stack`];

	static flags: typeof BaseCommand.flags &
		flags.Input<{
			force: boolean;
		}> = {
		...BaseCommand.flags,
		force: flags.boolean({
			char: 'f',
			description: 'force the stack to be created, even in a folder with existing contents.',
		}),
	};

	static args = [
		{
			name: 'name',
			required: false,
			description: 'the name of the new stack to create',
		},
		{
			name: 'template',
			required: false,
			description: 'Stack template',
			// TODO: Handle case where no templates are available. Prompt to install template(s).
			// Present available templates from locally installed repositories
			choices: async (): Promise<string[]> => {
				const officialRepo = await Repository.installOrUpdateOfficialRepository();
				const repos = [officialRepo]; //Repository.fromDefaultDirectory();
				// if (repos.length === 0) {
				//
				// }

				return Repository.availableTemplates(repos);
			},
		},
	];

	async do(): Promise<void> {
		const { args, flags } = this.parse(Stack);
		const { force } = flags;

		const prompts = await Promise.all(
			Stack.args
				.filter((arg) => !args[arg.name])
				.map(async (arg) => {
					const prompt = {
						name: arg.name,
						message: arg.description,
						type: 'string',
					};
					if (arg.choices) {
						prompt.type = 'list';
						prompt['choices'] = await arg.choices();
					}
					return prompt;
				}),
		);

		const promptArgs = await inquirer.prompt(prompts);

		const { name, template } = { ...args, ...promptArgs } as MakeStackArgs;

		if (!name.match(projectNameRegex)) {
			throw new Error(`stack name must be lowercase letters and dashes only. e.g. orders-service`);
		}

		const [templateRepo, templateName] = template.split('/');
		await new Listr([
			wrapTaskForListr(new MakeStackTask({ name, template: { name: templateName, repository: templateRepo }, force })),
		]).run();
	}
}

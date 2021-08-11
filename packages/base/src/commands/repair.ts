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

import { Stack, BaseCommand, wrapTaskForListr } from '@nitric/cli-common';
import { flags } from '@oclif/command';
import path from 'path';
import inquirer from 'inquirer';
import { InstallProjectTemplateTask } from '../tasks/repair';
import { Listr } from 'listr2';

/**
 * Nitric CLI repair command
 * Assists in detecting issues with the project which have occured due to upgrades or changes
 * Attempts to resolve known issues if possible (user prompted)
 */
export default class Repair extends BaseCommand {
	static description = 'attempt to find and repair issues with a broken project.';

	static examples = [`$ nitric repair`];

	static flags = {
		...BaseCommand.flags,
		file: flags.string({
			description: 'the stack definition file (default: ./nitric.yaml)',
		}),
	};

	static args = [];

	async do(): Promise<void> {
		const { args, flags } = this.parse(Repair);
		const { file = './nitric.yaml' } = flags;
		const { directory = '.' } = args;
		const stack = await Stack.fromFile(path.join(directory, file));
		const { services = {} } = stack.asNitricStack();

		// Find all templates referenced by services in the stack provided.
		const projectTemplates = await Promise.all(
			Object.values(services)
				.map(({ runtime }) => runtime)
				.map(async (runtime) => {
					return {
						runtime,
						available: await stack.hasTemplate(runtime),
					};
				}),
		);

		// Find referenced templates that aren't available in the project templates directory
		const missing = projectTemplates
			.filter(({ available }) => !available)
			.map(({ runtime }) => runtime)
			.filter((value, ix, self) => self.indexOf(value) === ix);

		// Prompt the user to accept before updating
		const templatePrompts = [
			{
				name: 'template install',
				message: `Template(s) ${missing.join(', ')} are missing from your project. Would you like to try and add them?`,
				type: 'confirm',
			},
		];

		// Attempt to install any templates references by services in the stack, but missing from the project templates directory
		const shouldInstall = await inquirer.prompt(templatePrompts);
		if (shouldInstall) {
			await new Listr(
				[
					{
						title: 'Installing Project Templates',
						task: (_, task): Listr =>
							task.newListr(
								missing.map((template) => wrapTaskForListr(new InstallProjectTemplateTask({ stack, template }))),
							),
					},
				],
				{
					rendererOptions: { collapse: false },
					exitOnError: false,
					concurrent: true,
				},
			).run();
		}
	}
}

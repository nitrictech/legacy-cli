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

import { Stack, BaseCommand } from '@nitric/cli-common';
import { pullTemplate } from '../utils';
import { flags } from '@oclif/command';
import cli from 'cli-ux';
// import emoji from 'node-emoji';
// import chalk from 'chalk';
// import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

/**
 * Nitric CLI repair command
 * Assists in detecting issues with the project which have occured due to upgrades or changes
 * Attempts to resolve known issues if possible.
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

		const projectTemplates = Object.values(services).map(({ runtime }) => runtime);
		const availability = await Promise.all(
			projectTemplates.map(async (runtime) => {
				return {
					runtime,
					available: await stack.hasTemplate(runtime),
				};
			}),
		);
		const missing = availability
			.filter(({ available }) => !available)
			.map(({ runtime }) => runtime)
			.filter((value, ix, self) => self.indexOf(value) === ix);

		cli.log('Missing: ', JSON.stringify(missing));

		const templatePrompts = [
			{
				name: 'template install',
				message: `Template(s) ${missing.join(', ')} are missing from your project. Would you like to try and add them?`,
				type: 'confirm',
			},
		];

		const shouldInstall = await inquirer.prompt(templatePrompts);

		// Prompt the user to accept before updating
		if (shouldInstall) {
			// is the template available in the repo or valid

			await Promise.all(
				missing.map((missing) => {
					try {
						return pullTemplate(stack, missing);
					} catch (e) {
						cli.log('Unable to add template: ', JSON.stringify(missing));
						return;
					}
				}),
			);
		}
	}
}

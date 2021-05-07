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
import { BaseCommand, wrapTaskForListr, Stack, NitricStack } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import { Down } from '../../tasks/down';
import inquirer from 'inquirer';

export default class DownCmd extends BaseCommand {
	static description = 'Delete a Nitric application on Google Cloud Platform (GCP)';

	static examples = [`$ nitric down:gcp`];

	static flags = {
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		guided: flags.boolean({
			default: false,
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
	};

	static args = [{ name: 'dir' }];

	async do(): Promise<void> {
		const { args, flags } = this.parse(DownCmd);
		const { guided } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(DownCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DownCmd.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				} else if (flag.type === 'boolean') {
					prompt.type = 'confirm';
				}
				return prompt;
			});

		let promptFlags = {};
		if (guided) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { file } = { ...flags, ...promptFlags };
		const stackDefinitionPath = path.join(dir, file);
		const stack: NitricStack = await (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		await new Listr([
			wrapTaskForListr(
				new Down({
					stackName: stack.name,
				}),
			),
		]).run();
	}
}

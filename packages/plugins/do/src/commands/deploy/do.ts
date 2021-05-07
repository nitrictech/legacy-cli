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
import { Deploy } from '../../tasks/deploy';
import { BaseCommand, wrapTaskForListr, Stack, StageStackTask } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import inquirer from 'inquirer';

export default class DeployCmd extends BaseCommand {
	static description = 'Deploy a Nitric application to Digital Ocean';

	static examples = [`$ nitric deploy:do . -r nyc1`];

	static flags = {
		containerRegistry: flags.string({
			char: 'c',
			description: 'Digital Ocean Container Registry to deploy services to',
		}),
		region: flags.enum({
			char: 'r',
			description: 'Digital Ocean Region to deploy to',
			options: ['nyc1', 'sfo1', 'nyc2', 'ams2', 'sgp1', 'lon1', 'nyc3', 'ams3', 'fra1', 'tor1', 'sfo2', 'blr1', 'sfo3'],
		}),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml' as string,
			description: 'Nitric descriptor file location',
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
	};

	static args = [{ name: 'dir', default: '.' }];

	async do(): Promise<any> {
		const { args, flags } = this.parse(DeployCmd);
		const { dir } = args;

		const token = process.env['DIGITALOCEAN_TOKEN'];

		if (!token) {
			throw new Error(
				'Environment not configured for use with digital ocean, please run nitric doctor:do to get setup',
			);
		}

		const prompts = Object.keys(DeployCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DeployCmd.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				}
				return prompt;
			});
		const promptFlags = await inquirer.prompt(prompts);

		const { containerRegistry, region, file } = { ...flags, ...promptFlags } as Record<keyof typeof flags, string>;

		if (!containerRegistry) {
			throw new Error('No Container Registry specified');
		}

		const stackDefinitionPath = path.join(dir, file);
		const stack = await Stack.fromFile(stackDefinitionPath);

		try {
			await new Listr([
				wrapTaskForListr(new StageStackTask({ stack })),
				wrapTaskForListr(new Deploy({ stack, registryName: containerRegistry, region, token })),
			]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

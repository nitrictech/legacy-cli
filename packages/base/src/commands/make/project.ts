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
import { MakeProjectTask, MakeServiceTask, AddRepositoryTask, UpdateStoreTask } from '../../tasks';
import { Listr, ListrTask } from 'listr2';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import { OFFICIAL_REPOSITORIES } from '../../constants';

const projectNameRegex = /^[a-z]+(-[a-z]+)*$/g;

export default class Project extends BaseCommand {
	static description = 'Creates a new Nitric project';

	static examples = [`$ nitric make:function .`];

	static flags: typeof BaseCommand.flags &
		flags.Input<{
			force: boolean;
		}> = {
		...BaseCommand.flags,
		force: flags.boolean({ char: 'f' }),
	};

	static args = [
		{
			name: 'name',
			required: true,
			description: 'the name of the new project to create',
		},
	];

	async do(): Promise<void> {
		const { args, flags } = this.parse(Project);
		const { name } = args;
		const { force } = flags;
		let commands: ListrTask[] = [];

		if (!name.match(projectNameRegex)) {
			throw new Error(`project name must be lowercase letters and dashes only. e.g. example-project-name`);
		}

		let repos = Repository.fromDefaultDirectory();

		if (repos.length == 0) {
			// XXX: Should we offer to fetch the official repository
			const fetchOfficial = await cli.confirm(
				'No repositories found, install the official template repositories? [y/n]',
			);
			if (!fetchOfficial) {
				// XXX: Is this true or should we default to none as the template?
				throw new Error(
					'You need at least one template repository installed to continue, please run `nitric templates:repos add` to install',
				);
			}

			// Update the store and add the official repository
			await new Listr([
				wrapTaskForListr(new UpdateStoreTask()),
				...OFFICIAL_REPOSITORIES.map((repo) => wrapTaskForListr(new AddRepositoryTask({ alias: repo }))),
			]).run();

			// Refresh templates
			repos = Repository.fromDefaultDirectory();
		}

		const templates = Repository.availableTemplates(repos);

		const { example }: { example: string } = await inquirer.prompt([
			{
				name: 'example',
				message: 'Include an example service?',
				type: 'list',
				choices: [...templates, 'none'],
			},
		]);

		if (example !== 'none') {
			const { serviceName } = await inquirer.prompt([
				{
					name: 'serviceName',
					message: 'Name for the example service?',
					type: 'input',
					default: 'example',
				},
			]);

			// Create an example service to go along with the project
			commands = [
				wrapTaskForListr(
					new MakeServiceTask({
						template: example,
						dir: `./${name}/${serviceName}/`,
						file: `./${name}/nitric.yaml`,
						name: serviceName,
						initialService: true, // required for creation of initial service path
					}),
				),
			];
		}

		await new Listr([wrapTaskForListr(new MakeProjectTask(name, force)), ...commands]).run();
	}
}

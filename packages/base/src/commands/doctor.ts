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

import { BaseCommand, Task, Repository, NITRIC_REPOSITORIES_FILE, block } from '@nitric/cli-common';
import which from 'which';
import cli from 'cli-ux';
import emoji from 'node-emoji';
import chalk from 'chalk';
import stream from 'stream';
import execa from 'execa';
import fs from 'fs';
import { InstallPulumi, InstallDocker, UpdateStoreTask, AddRepositoryTask } from '../tasks';
import { OFFICIAL_REPOSITORIES } from '../constants';

interface Software {
	name: string;
	icon: string;
	installDocs: string;
}

/**
 * Software required for the Nitric CLI to be fully functional
 */
const PREREQUISITE_SOFTWARE: Software[] = [
	{
		name: 'pulumi' /* Used for deployments */,
		icon: ':cloud: ',
		installDocs: 'https://www.pulumi.com/docs/get-started/install/',
	},
	{
		name: 'docker' /* Used for 'build' and 'run' commands */,
		icon: ':whale:',
		installDocs: 'https://www.docker.com/get-started',
	},
];

interface InputPassthroughOptions {
	stdin: stream.Readable;
	stdout: stream.Writable;
}

/**
 * Maps prerequisite software to tasks that install them
 */
const INSTALL_TASK_MAP: Record<string, { new (opts: InputPassthroughOptions): Task<void> }> = {
	pulumi: InstallPulumi,
	docker: InstallDocker,
};

/**
 * Nitric CLI doctor command
 * Assists in verifying that the CLI is ready to use and prerequisite software is installed.
 * Attempts to resolve known issues if possible.
 */
export default class Doctor extends BaseCommand {
	static description = 'check environment for config and prerequisite software';

	static examples = [`$ nitric doctor`];

	static flags = {
		...BaseCommand.flags,
	};

	static args = [];

	async do(): Promise<void> {
		let exit = false;

		// Determine the install status of prerequisite software
		const statuses = PREREQUISITE_SOFTWARE.map((software) => ({
			...software,
			installed: !!which.sync(software.name, { nothrow: true }),
		}));

		// Removing images from docker
		const prune = await cli.confirm('\nRemove all previously installed/unused images from docker? [y/n]');
		if (prune) {
			try {
				const output = execa.sync('docker', ['image', 'prune', '-a', '-f']);
				cli.info('Pruning unused images - \n' + output.stdout + '\n');
			} catch (e) {
				cli.info('Unable to prune docker images. Check the Daemon is running.');
			}
		}

		// Check for missing store and templates
		const repos = Repository.fromDefaultDirectory();
		const storeExists = fs.existsSync(NITRIC_REPOSITORIES_FILE);
		const missingTemplates = !repos.length || !storeExists;

		// Display doctor results
		cli.table(
			[
				...statuses,
				{
					name: 'setup a nitric repository',
					installed: !missingTemplates,
					icon: ':rocket:',
				},
			],
			{
				'Doctor summary:': {
					get: ({ name, icon, installed }): string =>
						installed
							? chalk.greenBright(emoji.emojify(`${icon} ${name}`))
							: chalk.redBright(emoji.emojify(`${icon} ${name}`)),
				},
			},
		);

		const missingSoftware = statuses.filter(({ installed }) => !installed);

		if (missingSoftware.length > 0) {
			const autoFix = await cli.confirm('\nAttempt to automatically install missing software? [y/n]');

			if (autoFix) {
				// Get and run the install tasks for the missing software
				const tasks = missingSoftware.map((soft) => INSTALL_TASK_MAP[soft.name]);
				for (let i = 0; i < tasks.length; i++) {
					await new tasks[i]({ stdin: process.stdin, stdout: process.stdout }).run();
				}
			} else {
				cli.info('\nNo worries, installation instructions for missing software can be found below:');

				missingSoftware.forEach(({ name, icon, installDocs }) => {
					const string = emoji.emojify(`${icon} ${name}`);
					cli.url(string, installDocs);
				});

				exit = true;
				cli.log();
			}
		}

		if (missingTemplates) {
			const autoFixRepos = await cli.confirm('Install the official template repositories? [y/n]');

			if (autoFixRepos) {
				await new UpdateStoreTask().run();
				await Promise.all(OFFICIAL_REPOSITORIES.map((repo) => new AddRepositoryTask({ alias: repo }).run()));
			} else {
				cli.info(
					block`At least one template repository is required, make a new project or run ${chalk.cyan(
						'nitric templates:repos:add',
					)} to install.`,
				);

				exit = true;
			}
		}

		if (exit) {
			return;
		}

		cli.info(block`Good to go 👍 Enjoy using Nitric 🎉`);
	}
}

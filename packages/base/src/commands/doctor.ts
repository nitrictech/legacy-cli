import { Command, flags } from '@oclif/command';
import { Task, Repository, NITRIC_REPOSITORIES_FILE } from '@nitric/cli-common';
import which from 'which';
import cli from 'cli-ux';
import emoji from 'node-emoji';
import chalk from 'chalk';
import stream from 'stream';
import fs from 'fs';
import { InstallPulumi, InstallDocker } from '../tasks/doctor';
import { UpdateStoreTask } from '../tasks/store/update';
import { AddRepositoryTask } from '../tasks/repository/add';

interface Software {
	name: string;
	icon: string;
	installDocs: string;
}

const PREREQUISITE_SOFTWARE: Software[] = [
	{
		name: 'pulumi',
		icon: ':cloud: ',
		installDocs: 'https://www.pulumi.com/docs/get-started/install/',
	},
	{
		name: 'docker',
		icon: ':whale:',
		installDocs: 'https://www.docker.com/get-started',
	},
];

interface InputPassthroughOptions {
	stdin: stream.Readable;
	stdout: stream.Writable;
}

const INSTALL_TASK_MAP: Record<string, { new (opts: InputPassthroughOptions): Task<void> }> = {
	pulumi: InstallPulumi,
	docker: InstallDocker,
};

/**
 * Nitric CLI build command
 * Will use docker to build the users application as a docker image
 * ready to be executed on a CaaS
 */
export default class Doctor extends Command {
	static description = 'Checks environment for configuration and pre-requisite software';

	static examples = [`$ nitric doctor`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		let exit = false;

		const statuses = PREREQUISITE_SOFTWARE.map((software) => ({
			...software,
			installed: !!which.sync(software.name, { nothrow: true }),
		}));

		// Check for missing store and templates
		const repos = Repository.fromDefaultDirectory();
		const storeExists = fs.existsSync(NITRIC_REPOSITORIES_FILE);
		const missingTemplates = !repos.length || !storeExists;

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

		const uninstalledSoftware = statuses.filter(({ installed }) => !installed);

		if (uninstalledSoftware.length > 0) {
			cli.log();
			const autoFix = await cli.confirm('Would you like nitric to try installing missing software? [y/n]');

			if (autoFix) {
				// Get install tasks...
				const tasks = uninstalledSoftware.map((soft) => INSTALL_TASK_MAP[soft.name]);
				// await new Listr(tasks.map((task) => wrapTaskForListr(new task()))).run();
				for (let i = 0; i < tasks.length; i++) {
					await new tasks[i]({ stdin: process.stdin, stdout: process.stdout }).run();
				}
			} else {
				cli.log();

				cli.info('No worries, installation instructions for missing pre-requisites can be found below:');

				uninstalledSoftware.forEach(({ name, icon, installDocs }) => {
					const string = emoji.emojify(`${icon} ${name}`);
					cli.url(string, installDocs);
				});

				exit = true;

				cli.log();
			}
		}

		if (missingTemplates) {
			cli.log();

			const autoFixRepos = await cli.confirm('Would you like nitric to install the official repository? [y/n]');

			if (autoFixRepos) {
				await new UpdateStoreTask().run();
				await new AddRepositoryTask({ alias: 'official' }).run();
			} else {
				cli.log();

				cli.info(
					`At least one template repository is required, make a new project or run ${chalk.cyan(
						'nitric templates:repos:add',
					)} to install.`,
				);

				exit = true;

				cli.log();
			}
		}

		if (exit) {
			return;
		}

		cli.log();
		cli.info('Good to go 👍 Enjoy using Nitric 🎉');
		cli.log();
	}
}

import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Task } from '@nitric/cli-common';
import Listr from 'listr';
import which from 'which';
import cli from 'cli-ux';
import emoji from 'node-emoji';
import chalk from 'chalk';
import stream from 'stream';
import { InstallPulumi, InstallDocker } from '../tasks/doctor';

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
		// const { args, flags } = this.parse(Doctor);
		const statuses = PREREQUISITE_SOFTWARE.map((software) => ({
			...software,
			installed: !!which.sync(software.name, { nothrow: true }),
		}));

		cli.table(statuses, {
			'installed?': {
				get: ({ name, icon, installed }): string =>
					installed
						? chalk.greenBright(emoji.emojify(`${icon} ${name}`))
						: chalk.redBright(emoji.emojify(`${icon} ${name}`)),
			},
		});
		const uninstalledSoftware = statuses.filter(({ installed }) => !installed);

		if (uninstalledSoftware.length > 0) {
			const autoFix = await cli.confirm('Would you like nitric to try installing missing software? [y/n]');

			if (autoFix) {
				// Get install tasks...
				const tasks = uninstalledSoftware.map((soft) => INSTALL_TASK_MAP[soft.name]);
				// await new Listr(tasks.map((task) => wrapTaskForListr(new task()))).run();
				for (let i = 0; i < tasks.length; i++) {
					await new tasks[i]({ stdin: process.stdin, stdout: process.stdout }).run();
				}
			} else {
				cli.info('No worries, installation instructions for missing pre-requisites can be found below:');

				uninstalledSoftware.forEach(({ name, icon, installDocs }) => {
					const string = emoji.emojify(`${icon} ${name}`);
					cli.url(string, installDocs);
				});

				return;
			}
		}

		cli.info('Good to go 👍 Enjoy using Nitric 🎉');
	}
}

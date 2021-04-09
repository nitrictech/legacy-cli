import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { Listr } from 'listr2';
import { CheckPulumiPluginTask, InstallPulumiPluginTask } from '../../tasks/doctor';

/**
 * Nitric CLI Azure Doctor command
 * Will check and install pre-requisite software for deploying Nitric applications to Azure
 */
export default class Doctor extends Command {
	static description = 'Checks environment for configuration for deployment to Azure';

	static examples = [`$ nitric doctor:azure`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		await new Listr<any>([
			wrapTaskForListr(new CheckPulumiPluginTask(), 'installed'),
			wrapTaskForListr({
				name: 'Install Azure Plugin',
				factory: () => new InstallPulumiPluginTask(),
				skip: (ctx) => ctx.installed,
			}),
		]).run();

		cli.info("Good to go 👍 You're ready to deploy to Azure with Nitric 🎉");
	}
}

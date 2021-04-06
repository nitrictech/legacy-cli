import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { Listr } from 'listr2';
import { CheckPulumiPlugins, InstallAWSPulumiPlugin } from '../../tasks/doctor';

/**
 * Nitric AWS Doctor command
 * Will Check pre-requisite software and configurations for deploying to AWS
 */
export default class Doctor extends Command {
	static description = 'Checks environment for configuration for deployment to AWS';

	static examples = [`$ nitric doctor:aws`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		await new Listr<any>([
			wrapTaskForListr(new CheckPulumiPlugins(), 'installed'),
			wrapTaskForListr({
				name: 'Install AWS Plugin',
				factory: () => new InstallAWSPulumiPlugin(),
				skip: (ctx) => ctx.installed,
			}),
		]).run();

		cli.info("Good to go 👍 You're ready to deploy to AWS with Nitric 🎉");
	}
}

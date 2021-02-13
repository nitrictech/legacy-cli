import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import Listr from 'listr';
import { CheckPlugins, InstallGCPPulumiPlugin } from '../../tasks/doctor';

/**
 * Nitric CLI GCP Doctor command
 * Will check and install pre-requisite software for deploying Nitric applicaitons to GCP
 */
export default class Doctor extends Command {
	static description = 'Checks environment for configuration for deployment to GCP';

	static examples = [`$ nitric doctor:gcp`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
    await new Listr<any>([
			wrapTaskForListr(new CheckPlugins(), 'installed'),
			wrapTaskForListr({
				name: 'Install GCP Plugin',
				factory: () => new InstallGCPPulumiPlugin(),
				skip: (ctx) => ctx.installed,
			}),
		]).run();

		cli.info("Good to go 👍 You're ready to deploy to GCP with Nitric 🎉");
	}
}

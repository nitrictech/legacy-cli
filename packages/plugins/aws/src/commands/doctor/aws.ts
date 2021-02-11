import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import cli from "cli-ux";
import Listr from 'listr';
import { CheckPulumiPlugins } from '../../tasks/doctor';

// interface Software {
//   name: string;
//   icon: string;
//   installDocs: string;
// }

// const PREREQUISITE_SOFTWARE: Software[] = [{
//   name: "pulumi",
//   icon: ":cloud: ",
//   installDocs: 'https://www.pulumi.com/docs/get-started/install/',
// }, {
//   name: "docker",
//   icon: ":whale:",
//   installDocs: 'https://www.docker.com/get-started',
// }];

// const INSTALL_TASK_MAP: Record<string, { new (): Task<void> }> = {
//   "pulumi": InstallPulumi,
//   "docker": InstallDocker
// };

/**
 * Nitric CLI build command
 * Will use docker to build the users application as a docker image
 * ready to be executed on a CaaS
 */
export default class Doctor extends Command {
	static description = 'Checks environment for configuration for deployment to AWS';

	static examples = [`$ nitric doctor:aws`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

  static args = [];

	async run(): Promise<void> {
    // const { args, flags } = this.parse(Doctor);
    
    await new Listr<any>([
			wrapTaskForListr(new CheckPulumiPlugins(), "installed"),
			wrapTaskForListr({ 
				name: "Install AWS Plugin", 
				factory: () => new InstallAWSPlugin(),
				skip: (ctx) => ctx.installed,
			}),
    ]).run();
    

    cli.info("Good to go 👍 You're ready to deploy to AWS with Nitric 🎉");
	}
}

import { Command, flags } from '@oclif/command';
import { readNitricDescriptor, wrapTaskForListr, NitricStack, NitricImage, Task } from '@nitric/cli-common';
import { BuildFunctionTask } from '../tasks/build';
import Listr, { ListrTask } from 'listr';
import which from "which";
import cli from "cli-ux";
import emoji from 'node-emoji';
import chalk from "chalk";
import { InstallPulumi, InstallDocker } from '../tasks/doctor';

export function createBuildTasks(stack: NitricStack, directory: string, provider = 'local'): Listr {
	return new Listr([
		{
			title: 'Building Functions',
			task: (): Listr =>
				new Listr(
					stack.functions!.map(
						(func): ListrTask =>
							wrapTaskForListr(
								new BuildFunctionTask({
									func,
									baseDir: directory,
									stackName: stack.name,
									provider,
								}),
							),
					),
					{
						concurrent: true,
						// Don't fail all on a single function failure...
						exitOnError: false,
					},
				),
		},
	]);
}

interface Software {
  name: string;
  icon: string;
  installDocs: string;
}

const PREREQUISITE_SOFTWARE: Software[] = [{
  name: "pulumi",
  icon: ":cloud: ",
  installDocs: 'https://www.pulumi.com/docs/get-started/install/',
}, {
  name: "docker",
  icon: ":whale:",
  installDocs: 'https://www.docker.com/get-started',
}];

const INSTALL_TASK_MAP: Record<string, { new (): Task<void> }> = {
  "pulumi": InstallPulumi,
  "docker": InstallDocker
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
  
    const statuses = PREREQUISITE_SOFTWARE.map(software => ({
      ...software,
      installed: !!which.sync(software.name, {nothrow: true})
    }));

    cli.table(statuses, {
      status: {
        get: ({ name, icon, installed }) => installed ? chalk.greenBright(emoji.emojify(`${icon} ${name}`)) : chalk.redBright(emoji.emojify(`${icon} ${name}`))
      },
    });
    const uninstalledSoftware = statuses.filter(({installed}) => !installed);

    if (uninstalledSoftware.length > 0) {
      const autoFix = await cli.confirm('Would you like nitric to try installing missing software?');

      if (autoFix) {
        // Get install tasks...
        const tasks = uninstalledSoftware.map(soft => INSTALL_TASK_MAP[soft.name])
        await new Listr(tasks.map(task => wrapTaskForListr(new task()))).run()
      } else {
        cli.info("No worries, installation instructions for missing pre-requisites can be found below:");
      }
    }

    cli.info("Good to go 👍 Enjoy using nitric 🎉");
	}
}

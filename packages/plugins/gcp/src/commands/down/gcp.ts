import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, readNitricDescriptor } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import { Down } from '../../tasks/down';

export default class DownCmd extends Command {
	static description = 'Delete a Nitric application on Google Cloud Platform (GCP)';

	static examples = [`$ nitric down:gcp . -p my-gcp-project`];

	static flags = {
		project: flags.string({
			char: 'p',
			description: 'gcp project to delete',
			required: true,
		}),
		file: flags.string({ char: 'f' }),
		keepResources: flags.boolean({ char: 'k' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(DownCmd);
		const { dir } = args;
		const { project, file = 'nitric.yaml', keepResources } = flags;

		const stack = readNitricDescriptor(path.join(dir, file));

		await new Listr([
			wrapTaskForListr(
				new Down({
					gcpProject: project,
					stackName: stack.name,
					keepResources,
				}),
			),
		]).run();
	}
}

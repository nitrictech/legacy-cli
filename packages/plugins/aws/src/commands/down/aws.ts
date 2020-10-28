import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, readNitricDescriptor } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import { Down } from '../../tasks/down';

export default class DownCmd extends Command {
	static description = 'Delete a CloudFormation Stack on AWS that was deployed by $ nitric deploy:aws';

	static examples = [`$ nitric down:aws . -s MyCloudFormationStack -r us-east-1`];

	static flags = {
		stackName: flags.string({
			char: 's',
			description: 'CloudFormation stack name, defaults to the name in the Nitric file if not provided.',
			required: false,
		}),
		region: flags.string({
			char: 'r',
			description: 'AWS Region to tear down the stack in',
			required: true,
		}),
		file: flags.string({ char: 'f' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<any> {
		const { args, flags } = this.parse(DownCmd);
		const { dir } = args;
		const { file = 'nitric.yaml', region, stackName } = flags;

		const stack = readNitricDescriptor(path.join(dir, file));

		try {
			await new Listr([wrapTaskForListr(new Down({ stackName, stack, region }))]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

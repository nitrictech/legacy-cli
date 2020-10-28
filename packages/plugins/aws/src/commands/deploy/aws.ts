import { Command, flags } from '@oclif/command';
import { Deploy, PushImage } from '../../tasks/deploy';
import { wrapTaskForListr, readNitricDescriptor } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Amazon Web Services (AWS)';

	static examples = [`$ nitric deploy:aws . -a 123123123123 -r us-east-1`];

	static flags = {
		account: flags.string({
			char: 'a',
			description: 'AWS Account ID to deploy to',
			required: true,
		}),
		region: flags.string({
			char: 'r',
			description: 'AWS Region to deploy to',
			required: true,
		}),
		file: flags.string({ char: 'f' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<any> {
		const { args, flags } = this.parse(DeployCmd);
		const { dir } = args;
		const { account, region, file = 'nitric.yaml' } = flags;

		const stack = readNitricDescriptor(path.join(dir, file));

		try {
			await new Listr([
				{
					title: 'Pushing Images to ECR',
					task: (): Listr =>
						new Listr(
							stack.functions!.map((func) =>
								wrapTaskForListr(
									new PushImage({
										account: account,
										region: region,
										stackName: stack.name,
										func,
									}),
								),
							),
							{ concurrent: true },
						),
				},
				wrapTaskForListr(new Deploy({ stack, account, region })),
			]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

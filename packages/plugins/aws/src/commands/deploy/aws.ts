import { Command, flags } from '@oclif/command';
import { Deploy } from '../../tasks/deploy';
import { wrapTaskForListr, Stack, StageStackTask } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import AWS from 'aws-sdk';
import inquirer from 'inquirer';

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Amazon Web Services (AWS)';

	static examples = [`$ nitric deploy:aws . -a 123123123123 -r us-east-1`];

	static flags = {
		account: flags.string({
			char: 'a',
			description: 'AWS Account ID to deploy to (default: locally configured account)',
		}),
		region: flags.enum({
			char: 'r',
			description: 'AWS Region to deploy to',
			options: [
				'us-east-1',
				'us-west-1',
				'us-west-2',
				'eu-west-1',
				'eu-central-1',
				'ap-southeast-1',
				'ap-northeast-1',
				'ap-southeast-2',
				'ap-northeast-2',
				'sa-east-1',
				'cn-north-1',
				'ap-south-1',
			],
		}),
		// vpc: flags.string({
		// 	description: 'VPC to deploy in',
		// }),
		// cluster: flags.string({
		// 	char: 'c',
		// 	description: 'ECS cluster to use',
		// }),
		// subnets: flags.string({
		// 	char: 's',
		// 	description: 'VPC subnets to deploy in, comma separated e.g. subnet-1bbb2222,subnet-2ccc3333',
		// }),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml' as string,
			description: 'Nitric descriptor file location',
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
	};

	static args = [{ name: 'dir', default: '.' }];

	async run(): Promise<any> {
		const { args, flags } = this.parse(DeployCmd);
		const { dir } = args;
		const sts = new AWS.STS();
		const { Account: derivedAccountId } = await sts.getCallerIdentity({}).promise();

		const prompts = Object.keys(DeployCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DeployCmd.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				}
				return prompt;
			});
		const promptFlags = await inquirer.prompt(prompts);

		const { account, region, file } = { ...flags, ...promptFlags } as Record<keyof typeof flags, string>;
		// const subnets = subnetsString.split(',');

		// if (subnets.length < 2) {
		// 	throw new Error('At least 2 subnets must be provided.');
		// }

		if (!account && !derivedAccountId) {
			throw new Error('No account provided or deduced.');
		}

		const accountId = account || (derivedAccountId as string);
		const stackDefinitionPath = path.join(dir, file);
		const stack = await Stack.fromFile(stackDefinitionPath);

		try {
			await new Listr([
				wrapTaskForListr(new StageStackTask({ stack })),
				wrapTaskForListr(new Deploy({ stack, account: accountId, region })),
			]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

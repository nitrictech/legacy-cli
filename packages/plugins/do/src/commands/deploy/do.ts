import { Command, flags } from '@oclif/command';
import { Deploy } from '../../tasks/deploy';
import { wrapTaskForListr, Stack, StageStackTask } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import inquirer from 'inquirer';

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Digital Ocean';

	static examples = [`$ nitric deploy:do . -r nyc1`];

	static flags = {
		containerRegistry: flags.string({
			char: 'c',
			description: 'Digital Ocean Container Registry to deploy services to',
		}),
		region: flags.enum({
			char: 'r',
			description: 'Digital Ocean Region to deploy to',
			options: ['nyc1', 'sfo1', 'nyc2', 'ams2', 'sgp1', 'lon1', 'nyc3', 'ams3', 'fra1', 'tor1', 'sfo2', 'blr1', 'sfo3'],
		}),
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

		const token = process.env['DIGITALOCEAN_TOKEN'];

		if (!token) {
			throw new Error(
				'Environment not configured for use with digital ocean, please run nitric doctor:do to get setup',
			);
		}

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

		const { containerRegistry, region, file } = { ...flags, ...promptFlags } as Record<keyof typeof flags, string>;

		if (!containerRegistry) {
			throw new Error('No Container Registry specified');
		}

		const stackDefinitionPath = path.join(dir, file);
		const stack = await Stack.fromFile(stackDefinitionPath);

		try {
			await new Listr([
				wrapTaskForListr(new StageStackTask({ stack })),
				wrapTaskForListr(new Deploy({ stack, registryName: containerRegistry, region, token })),
			]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

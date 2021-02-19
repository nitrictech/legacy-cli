import { Command, flags } from '@oclif/command';
import Listr from 'listr';
import inquirer from 'inquirer';
import { Stack, StageStackTask, wrapTaskForListr } from '@nitric/cli-common';
import path from 'path';

// XXX: Commented out regions do not support cloud run
const SUPPORTED_REGIONS = [
	'TODO',
];

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Google Cloud Platform (GCP)';

	static examples = [`$ nitric deploy:gcp`];

	static flags = {
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'azure region to deploy to',
		}),
		guided: flags.boolean({ default: false }),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		help: flags.help({ char: 'h', default: false }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(DeployCmd);
		const { guided } = flags;
		const { dir = '.' } = args;

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

		let promptFlags = {};
		if (guided) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { file, region } = { ...flags, ...promptFlags };

		if (!region) {
			throw new Error('Region must be provided, for prompts use the --guided flag');
		}

		const stack = await Stack.fromFile(path.join(dir, file));

		new Listr([
			wrapTaskForListr(new StageStackTask({ stack })),
			
		]).run();
	}
}

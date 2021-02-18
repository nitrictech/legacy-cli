import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Stack, NitricStack } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import { Down } from '../../tasks/down';
import inquirer from 'inquirer';

export default class DownCmd extends Command {
	static description = 'Delete a Nitric application on Google Cloud Platform (GCP)';

	static examples = [`$ nitric down:gcp`];

	static flags = {
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		guided: flags.boolean({
			default: false,
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(DownCmd);
		const { guided } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(DownCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DownCmd.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				} else if (flag.type === 'boolean') {
					prompt.type = 'confirm';
				}
				return prompt;
			});

		let promptFlags = {};
		if (guided) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { file } = { ...flags, ...promptFlags };
		const stackDefinitionPath = path.join(dir, file);
		const stack: NitricStack = await (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		await new Listr([
			wrapTaskForListr(
				new Down({
					stackName: stack.name,
				}),
			),
		]).run();
	}
}

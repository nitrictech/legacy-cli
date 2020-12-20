import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, readNitricDescriptor } from '@nitric/cli-common';
import Listr from 'listr';
import path from 'path';
import { Down } from '../../tasks/down';
import inquirer from 'inquirer';
import { google } from 'googleapis';

export default class DownCmd extends Command {
	static description = 'Delete a Nitric application on Google Cloud Platform (GCP)';

	static examples = [`$ nitric down:gcp`];

	static flags = {
		project: flags.string({
			char: 'p',
			description: 'Project to find and delete this nitric stack in (default is for locally configured account)',
		}),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		guided: flags.boolean({
			default: false,
		}),
		keepResources: flags.boolean({
			char: 'k',
			description: 'Keep deployed resources?',
			type: 'boolean',
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const derivedProject = await auth.getProjectId();
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

		const { project = derivedProject, file, keepResources } = { ...flags, ...promptFlags };
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

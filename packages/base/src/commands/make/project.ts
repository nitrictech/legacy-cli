import { Command, flags } from '@oclif/command';
import { wrapTaskForListr } from '@nitric/cli-common';
import { MakeProjectTask, MakeFunctionTask } from '../../tasks/make';
import { getAvailableTemplates } from '../../utils';
import Listr, { ListrTask } from 'listr';
import inquirer from 'inquirer';

const projectNameRegex = /^[a-z]+(-[a-z]+)*$/g;

export default class Project extends Command {
	static description = 'Creates a new Nitric project';

	static examples = [`$ nitric make:function .`];

	static flags = {
		help: flags.help({ char: 'h' }),
		force: flags.boolean(),
	};

	static args = [
		{
			name: 'name',
			required: true,
			description: 'the name of the new project to create',
		},
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(Project);
		const { name } = args;
		const { force } = flags;
		let commands: ListrTask[] = [];

		const { example }: { example: string } = await inquirer.prompt([
			{
				name: 'example',
				message: 'Include an example function?',
				type: 'list',
				choices: getAvailableTemplates(),
			},
		]);

		if (!name.match(projectNameRegex)) {
			throw new Error(`project name must be formatted as ${projectNameRegex}`);
		}

		if (example !== 'none') {
			const { functionName } = await inquirer.prompt([
				{
					name: 'functionName',
					message: 'Name for the example function?',
					type: 'input',
				},
			]);

			// Create an example function to go along with the project
			commands = [
				wrapTaskForListr(
					new MakeFunctionTask({
						template: example,
						dir: `./${name}/${functionName}/`,
						file: `./${name}/nitric.yaml`,
						name: functionName,
					}),
				),
			];
		}

		await new Listr([wrapTaskForListr(new MakeProjectTask(name, force)), ...commands]).run();
	}
}

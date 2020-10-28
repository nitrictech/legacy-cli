import { Command, flags } from '@oclif/command';
import { wrapTaskForListr } from '../../utils';
import { MakeProject, MakeFunctionTask } from '../../tasks/make';
import Listr, { ListrTask } from 'listr';
import inquirer from 'inquirer';

const projectNameRegex = /^[a-z]+(-[a-z]+)*$/g;

export default class Project extends Command {
	static description = 'Creates a new Nitric project';

	static examples = [`$ nitric make:function .`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [
		{
			name: 'name',
			required: true,
			description: 'the name of the new project to create',
		},
	];

	async run() {
		const { args } = this.parse(Project);
		const { name } = args;
		let commands: ListrTask[] = [];

		let { example }: { example: string } = await inquirer.prompt([
			{
				name: 'example',
				message: 'Include an example function?',
				type: 'list',
				choices: [{ name: 'nodejs12' }, { name: 'python37' }, { name: 'none' }],
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
						dir: `./${name}/`,
						name: functionName,
					}),
				),
			];
		}

		await new Listr([wrapTaskForListr(new MakeProject(name)), ...commands]).run();
	}
}

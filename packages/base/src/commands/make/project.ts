import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Repository } from '@nitric/cli-common';
import { MakeProjectTask, MakeFunctionTask } from '../../tasks/make';
import { AddRepositoryTask } from '../../tasks/repository/add';
import { UpdateStoreTask } from '../../tasks/store/update';
import { Listr, ListrTask } from 'listr2';
import cli from 'cli-ux';
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

		if (!name.match(projectNameRegex)) {
			throw new Error(`project name must be lowercase letters and dashes only. e.g. example-project-name`);
		}

		let repos = Repository.fromDefaultDirectory();

		if (repos.length == 0) {
			// XXX: Should we offer to fetch the official repository
			const fetchOfficial = await cli.confirm('No repositories found, install the the official repository? [y/n]');
			if (!fetchOfficial) {
				// XXX: Is this true or should we default to none as the template?
				throw new Error(
					'You need at least one template repository installed to continue, please run `nitric templates:repos add` to install',
				);
			}

			// Update the store and add the official repository
			await new Listr([
				wrapTaskForListr(new UpdateStoreTask()),
				wrapTaskForListr(new AddRepositoryTask({ alias: 'official' })),
			]).run();

			// Refresh templates
			repos = Repository.fromDefaultDirectory();
		}

		const templates = Repository.availableTemplates(repos);

		const { example }: { example: string } = await inquirer.prompt([
			{
				name: 'example',
				message: 'Include an example function?',
				type: 'list',
				choices: [...templates, 'none'],
			},
		]);

		if (example !== 'none') {
			const { functionName } = await inquirer.prompt([
				{
					name: 'functionName',
					message: 'Name for the example function?',
					type: 'input',
					default: 'example',
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

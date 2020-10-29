import { Command, flags } from '@oclif/command';
import { wrapTaskForListr } from '@nitric/cli-common';
import { MakeFunctionTask } from '../../tasks/make';
import Listr from 'listr';

export default class Function extends Command {
	static description = 'Builds a nitric function';

	static examples = ['$ nitric make:function .'];

	static flags = {
		help: flags.help({ char: 'h' }),
		directory: flags.string({
			char: 'd',
			description: 'directory where the new function should be made',
		}),
		file: flags.string({
			char: 'f',
			description: 'nitric project YAML file',
		}),
	};

	static args = [
		{
			name: 'template',
			required: true,
			description: 'template name to generate function from',
		},
		{
			name: 'name',
			required: true,
			description: 'the name of the new function to create',
		},
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(Function);
		const { template, name } = args;
		const { directory = '.', file = './nitric.yaml' } = flags;

		const functionDirectoryName = (name as string)
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^-a-z\d]/g, '');

		await new Listr([
			wrapTaskForListr(
				new MakeFunctionTask({
					template,
					dir: directory,
					name: functionDirectoryName,
					file,
				}),
			),
		]).run();
	}
}

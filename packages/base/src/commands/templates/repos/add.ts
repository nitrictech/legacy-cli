import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import { Listr } from 'listr2';
import { AddRepositoryTask } from '../../../tasks/repository/add';
import { UpdateStoreTask } from '../../../tasks/store/update';

export default class AddRepository extends Command {
	static description = 'Adds a new repository for nitric templates';

	static examples = ['$ nitric templates:repos:add'];

	static flags = {
		help: flags.help({ char: 'h' }),
		url: flags.string({
			char: 'u',
			description: 'URL of the git repository to retrieve template repository from',
		}),
	};

	static args = [
		{
			name: 'alias',
			required: false,
			description:
				'alias of the template repository to retrieve, will look in official nitric repo store first if url is given this will be the name downloaded repository',
		},
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(AddRepository);
		// Pull the official repository by default
		const { alias = 'official' } = args;
		const { url } = flags;

		await new Listr([
			wrapTaskForListr(new UpdateStoreTask()),
			wrapTaskForListr(new AddRepositoryTask({ alias, url })),
		]).run();
	}
}

import { Command, flags } from '@oclif/command';
import { ListTemplatesTask } from '../../tasks/template/list';
import { cli } from 'cli-ux';

export default class ListTemplates extends Command {
	static description = 'Lists locally available nitric templates';

	static examples = ['$ nitric templates:list'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		const templates = await new ListTemplatesTask().do();

		if (Object.keys(templates).length == 0) {
			// No templates found
			cli.log("No templates found, try installing some repositories using nitric templates:repos add");
		}

		const root = cli.tree();

		Object.keys(templates).forEach(key => {
			const repoTree = cli.tree();
			templates[key].forEach((template) => repoTree.insert(template));

			root.insert(key, repoTree);
		});

		root.display();
	}
}

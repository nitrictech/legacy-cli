import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Stack } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import { Down } from '../../tasks/down';

export default class DownCmd extends Command {
	static description = 'Delete a Stack on Digital Ocean deployed by $ nitric deploy:do';

	static examples = [`$ nitric down:do`];

	static flags = {
		file: flags.string({ char: 'f' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<any> {
		const { args, flags } = this.parse(DownCmd);
		const { dir = '.' } = args;
		const { file = 'nitric.yaml' } = flags;

		const stackDefinitionPath = path.join(dir, file);
		const stack = (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		try {
			await new Listr([wrapTaskForListr(new Down({ stack }))]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

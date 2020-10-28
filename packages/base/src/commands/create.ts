import { Command, flags } from '@oclif/command';

/**
 * Cloudless CLI create command
 */
export default class Create extends Command {
	static description = 'Creates a new cloudless project';

	static examples = [`$ cloudless create my-cloudless-project`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [
		{
			name: 'name',
		},
	];

	async run(): Promise<void> {
		const { args } = this.parse(Create);
		const { name } = args;

		if (!name) {
			// TODO: print help
			this.error('Missing project name');
		}

		this.log(`TODO: Create project ${name}`);
	}
}

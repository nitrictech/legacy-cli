import { BaseCommand } from '@nitric/cli-common';
import { flags } from '@oclif/command';
import { ConfigureTask } from '../tasks/configure/configure';

export default class Configure extends BaseCommand {
	static description = 'configure credentials';

	static examples = [`$ nitric configure --aws`];

	static flags = {
		...BaseCommand.flags,
		aws: flags.boolean({
			description: 'configure aws credentials',
		}),
		azure: flags.boolean({
			description: 'configure azure credentials',
		}),
		gcp: flags.boolean({
			description: 'configure gcp credentials',
		}),
	};

	async do(): Promise<void> {
		const { flags } = this.parse(Configure);
		const { aws, azure, gcp } = flags;
		try {
			await new ConfigureTask({ aws, azure, gcp }).run();
		} catch (e) {
			// eat this error to avoid duplicate console output.
		}
	}
}

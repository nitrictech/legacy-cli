import { Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface DownOptions {
	stackName: string;
}

const PROJECT_NAME = 'nitric-gcp';

/**
 * Tear down a deployed stack
 */
export class Down extends Task<void> {
	private stackName: string;

	constructor({ stackName }: DownOptions) {
		super(`Tearing Down Stack: ${stackName}`);
		this.stackName = stackName;
	}

	async do(): Promise<void> {
		const pulumiStack = await LocalWorkspace.selectStack({
			projectName: PROJECT_NAME,
			stackName: this.stackName,
			program: async () => {
				this.update('Tearing down stack');
			},
		});

		await pulumiStack.destroy({ onOutput: this.update.bind(this) });
	}
}

import { Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface DownOptions {
	stackName: string;
}

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
		const { stackName } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stackName,
				stackName: stackName,
				// generate our pulumi program on the fly from the POST body
				program: async () => {},
			});

			// await pulumiStack.setConfig("gcp:region", { value: region });
			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			console.log(res);
		} catch(e) {
			console.log(e);
			throw e;
		}
	}
}

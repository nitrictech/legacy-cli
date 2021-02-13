import { NitricStack, Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface DownOptions {
	region: string;
	stack: NitricStack;
	stackName?: string;
}

export class Down extends Task<void> {
	private region: string;
	private stack: NitricStack;

	constructor({ stack, region }: DownOptions) {
		super(`Tearing Down Stack: ${stack.name}`);
		this.stack = stack;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, region } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stack.name,
				stackName: stack.name,
				// generate our pulumi program on the fly from the POST body
				program: async () => {},
			});

			await pulumiStack.setConfig('aws:region', { value: region });
			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			console.log(res);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

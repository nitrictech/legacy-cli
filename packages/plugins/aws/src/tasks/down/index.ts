import { NitricStack, Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface DownOptions {
	region: string;
	stack: NitricStack;
	stackName?: string;
}

const NO_OP = async (): Promise<void> => { return; }

export class Down extends Task<void> {
	private stack: NitricStack;

	constructor({ stack }: DownOptions) {
		super(`Tearing Down Stack: ${stack.name}`);
		this.stack = stack;
	}

	async do(): Promise<void> {
		const { stack, } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stack.name,
				stackName: stack.name,
				// generate our pulumi program on the fly from the POST body
				program: NO_OP,
			});

			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			console.log(res);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

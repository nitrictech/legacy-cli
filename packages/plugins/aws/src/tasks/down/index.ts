import { NitricStack, Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';

interface DownOptions {
	stack: NitricStack;
}

const NO_OP = async (): Promise<void> => {
	return;
};

export class Down extends Task<void> {
	private stack: NitricStack;

	constructor({ stack }: DownOptions) {
		super(`Tearing Down Stack: ${stack.name}`);
		this.stack = stack;
	}

	async do(): Promise<void> {
		const { stack } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stack.name,
				stackName: 'aws',
				// generate our pulumi program on the fly from the POST body
				program: NO_OP,
			});

			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });

			if (res.summary && res.summary.resourceChanges) {
				const changes = Object.entries(res.summary.resourceChanges)
					.map((entry) => entry.join(': '))
					.join(', ');
				this.update(changes);
			}
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

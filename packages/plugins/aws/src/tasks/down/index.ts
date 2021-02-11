import { NitricStack, Task } from '@nitric/cli-common';
// import AWS from 'aws-sdk';
// import { DeleteStackInput } from 'aws-sdk/clients/cloudformation';
import { LocalWorkspace } from "@pulumi/pulumi/x/automation";

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

			await pulumiStack.setConfig("aws:region", { value: region });
			const res = await pulumiStack.destroy();
			console.log(res);
		} catch(e) {
			console.log(e);
			throw e;
		}

		// const cloudformation = new AWS.CloudFormation();

		// // Get the stack ID so we can watch for when the tear down is complete
		// try {
		// 	const description = await cloudformation.describeStacks({ StackName: stackName }).promise();
		// 	const stackId = description.Stacks![0].StackId;

		// 	const deleteInput: DeleteStackInput = {
		// 		StackName: stackName,
		// 	};
		// 	this.update(`Deleting Stack: ${stackName}`);
		// 	await cloudformation.deleteStack(deleteInput).promise();

		// 	await cloudformation.waitFor('stackDeleteComplete', { StackName: stackId }).promise();
		// } catch (error) {
		// 	throw new Error('Failed to delete stack, this may be because the stack name was not found.');
		// }
	}
}

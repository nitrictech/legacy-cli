import { NitricStack, normalizeStackName, Task } from '@nitric/cli-common';
import AWS from 'aws-sdk';
import { DeleteStackInput } from 'aws-sdk/clients/cloudformation';

interface DownOptions {
	region: string;
	stack: NitricStack;
	stackName?: string;
}

export class Down extends Task<void> {
	private stackName: string;
	private region: string;

	constructor({ stack, stackName, region }: DownOptions) {
		const name = stackName || normalizeStackName(stack);
		super(`Tearing Down Stack: ${name}`);
		this.stackName = name;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stackName, region } = this;

		AWS.config.update({ region });

		const cloudformation = new AWS.CloudFormation();

		// Get the stack ID so we can watch for when the tear down is complete
		try {
			const description = await cloudformation.describeStacks({ StackName: stackName }).promise();
			const stackId = description.Stacks![0].StackId;

			const deleteInput: DeleteStackInput = {
				StackName: stackName,
			};
			this.update(`Deleting Stack: ${stackName}`);
			await cloudformation.deleteStack(deleteInput).promise();

			await cloudformation.waitFor('stackDeleteComplete', { StackName: stackId }).promise();
		} catch (error) {
			throw new Error('Failed to delete stack, this may be because the stack name was not found.');
		}
	}
}

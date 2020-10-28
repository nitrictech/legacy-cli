import { Task, sanitizeStringForDockerTag } from '@nitric/cli-common';
import { deploymentmanager_v2beta, google } from 'googleapis';
import { operationToPromise } from '../utils';

interface DownOptions {
	gcpProject: string;
	stackName: string;
	keepResources: boolean;
}

/**
 * Tear down a deployed stack
 */
export class Down extends Task<void> {
	private stackName: string;
	private gcpProject: string;
	private keepResources: boolean;

	constructor({ stackName, gcpProject, keepResources }: DownOptions) {
		super(`Tearing Down Stack: ${stackName}`);
		this.stackName = stackName;
		this.gcpProject = gcpProject;
		this.keepResources = keepResources;
	}

	async do(): Promise<void> {
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();

		const dmClient = new deploymentmanager_v2beta.Deploymentmanager({
			auth: authClient,
		});

		const deletePolicy = this.keepResources ? 'ABANDON' : 'DELETE';

		this.update('Deleting Deployment');

		let { data: subOperation } = await dmClient.deployments.delete({
			project: this.gcpProject,
			deployment: `${sanitizeStringForDockerTag(this.stackName)}-subscriptions`,
			deletePolicy,
		});

		this.update(`Waiting for subscriptions to cleanup`);
		await operationToPromise(this.gcpProject, subOperation);

		let { data: operation } = await dmClient.deployments.delete({
			project: this.gcpProject,
			deployment: sanitizeStringForDockerTag(this.stackName),
			deletePolicy,
		});

		this.update(`Waiting for infrastructure to cleanup`);
		await operationToPromise(this.gcpProject, operation);
	}
}

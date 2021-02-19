import { google } from 'googleapis';
import { Task, Stack } from '@nitric/cli-common';
import { createFunction } from './functions';
import { createTopic } from './topics';
import { createBucket } from './buckets';
import { createSchedule } from './schedule';
import { createApi } from './apis';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface CommonOptions {
	gcpProject: string;
}

interface DeployOptions extends CommonOptions {
	stack: Stack;
	region: string;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	private gcpProject: string;
	private region: string;

	constructor({ stack, gcpProject, region }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.gcpProject = gcpProject;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, gcpProject, region } = this;
		const { buckets = [], apis = [], topics = [], schedules = [] } = stack.asNitricStack();
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				stackName: stack.getName(),
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// deploy the buckets
						(buckets || []).map(createBucket);
						// Deploy the topics
						const deployedTopics = (topics || []).map(createTopic);
						// deploy the functions
						const { token: imageDeploymentToken } = await authClient.getAccessToken();

						const stackFunctions = stack.getFunctions();

						if (stackFunctions === null) {
							throw new Error("WTF!!!");
						}

						const deployedFunctions = stackFunctions.map((f) =>
							createFunction(region, f, deployedTopics, imageDeploymentToken!, gcpProject),
						);
						// deploy the schedules
						(schedules || []).map((s) => createSchedule(s, deployedTopics));
						// deploy apis
						(apis || []).map((a) => createApi(a, deployedFunctions));
					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			});
			await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			await pulumiStack.setConfig('gcp:region', { value: region });
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({ onOutput: this.update.bind(this) });

			console.log(upRes);
		} catch (e) {
			console.log(e);
		}
	}
}

import { google } from 'googleapis';
import { Task, Stack } from '@nitric/cli-common';
import { createFunction } from './functions';
import { createTopic } from './topics';
import { createBucket } from './buckets';
import { createSchedule } from './schedule';
import { createApi } from './apis';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { createSite } from './site';
import { createEntrypoints } from './entrypoints';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';

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
		const { buckets = [], apis = [], topics = [], schedules = [], entrypoints } = stack.asNitricStack();
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();

		try {
			// Upload the stack
			const logFile = await stack.getLoggingFile('deploy:gcp');
			const errorFile = await stack.getLoggingFile('error:gcp');
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'gcp',
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

						const deployedSites = await Promise.all(stack.getSites().map(createSite));
						const stackFunctions = stack.getFunctions();

						const deployedFunctions = stackFunctions.map((f) =>
							createFunction(region, f, deployedTopics, imageDeploymentToken!, gcpProject),
						);
						// deploy the schedules
						(schedules || []).map((s) => createSchedule(s, deployedTopics));
						// deploy apis
						const deployedApis = await Promise.all((apis || []).map((a) => createApi(a, deployedFunctions)));

						if (entrypoints) {
							// Deployed Entrypoints
							createEntrypoints(stack.getName(), entrypoints, deployedSites, deployedApis, deployedFunctions);
						}
					} catch (e) {
						pulumi.log.error(e);
						fs.appendFileSync(errorFile, e);
					}
				},
			});
			await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			await pulumiStack.setConfig('gcp:region', { value: region });
			const update = this.update.bind(this);
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({
				onOutput: (out: string) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});

			console.log(upRes);
		} catch (e) {
			console.log(e);
		}
	}
}

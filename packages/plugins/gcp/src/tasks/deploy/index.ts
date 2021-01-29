import { deploymentmanager_v2beta, google } from 'googleapis';
import {
	Task,
	NitricFunction,
	NitricStack,
	sanitizeStringForDockerTag,
	getTagNameForFunction,
	dockerodeEvtToString,
} from '@nitric/cli-common';
import generateFunctionResources, { generateFunctionOutputs } from './functions';
import generateTopicResources from './topics';
import generateBucketResources from './buckets';
import generateSubscriptionsForFunction from './subscriptions';
import generateIamServiceAccounts from './invoker';
import Docker from 'dockerode';
import yaml from 'yaml';
import { operationToPromise } from '../utils';
import { getGcrHost } from './regions';

interface CommonOptions {
	gcpProject: string;
}

export class CreateTypeProviders extends Task<void> {
	private gcpProject: string;

	constructor({ gcpProject }: CommonOptions) {
		super('Configuring project for Nitric');
		this.gcpProject = gcpProject;
	}

	async do(): Promise<void> {
		// TODO: Make re-usable singleton module
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});

		const authClient = await auth.getClient();
		const dmClient = new deploymentmanager_v2beta.Deploymentmanager({
			auth: authClient,
		});

		this.update('Retrieving existing deployment provider list');
		const {
			data: { typeProviders },
		} = await dmClient.typeProviders.list({
			project: this.gcpProject,
		});

		const tps = {
			"nitric-cloud-run": {
				description: 'Type provider for deploying service to cloud run',
				descriptorUrl: 'https://run.googleapis.com/$discovery/rest?version=v1',
				name: 'nitric-cloud-run',
				options: {
					inputMappings: [
						{
							fieldName: 'Authorization',
							location: 'HEADER',
							value: '$.concat("Bearer ", $.googleOauth2AccessToken())',
						},
						{
							fieldName: 'name',
							location: 'PATH',
							// methodMatch: '^delete$',
							value: '$.concat($.resource.properties.parent, "/services/", $.resource.properties.metadata.name)',
						},
						{
							fieldName: 'resource',
							location: 'PATH',
							// methodMatch: '^delete$',
							value: '$.concat($.resource.properties.parent, "/services/", $.resource.properties.metadata.name)',
						},
					],
				},
			},
			"nitric-cloud-scheduler": {
				description: 'Type provider for deploying schedlues to cloud scheduler',
				descriptorUrl: 'https://cloudscheduler.googleapis.com/$discovery/rest?version=v1',
				name: 'nitric-cloud-scheduler',
				options: {
					inputMappings: [
						{
							fieldName: 'Authorization',
							location: 'HEADER',
							value: '$.concat("Bearer ", $.googleOauth2AccessToken())',
						},
						{
							fieldName: 'name',
							location: 'PATH',
							// methodMatch: '^delete$',
							value: '$.concat($.resource.properties.parent, "/jobs/", $.resource.properties.metadata.name)',
						},
						{
							fieldName: 'parent',
							location: 'PATH',
							// methodMatch: '^delete$',
							value: '$.resource.properties.parent',
						},
					],
				},
			}
		}

		// see if our type provider has already been installed
		// TODO: Needs more work in order to get update/delete working
		if (typeProviders?.map(({ name }) => name).includes('nitric-cloud-run')) {
			this.update('Updating existing type provider');
			await dmClient.typeProviders.update({
				project: this.gcpProject,
				typeProvider: 'nitric-cloud-run',
				requestBody: tps['nitric-cloud-run'],
			});
		} else {
			this.update('Create new type provider nitric-cloud-run');
			await dmClient.typeProviders.insert({
				project: this.gcpProject,
				requestBody: tps['nitric-cloud-run'],
			});
		}
	}
}

interface PushImageOptions extends CommonOptions {
	stackName: string;
	func: NitricFunction;
	region: string;
}

/**
 * Push an image to the GCR
 */
export class PushImage extends Task<void> {
	private gcpProject: string;
	private stackName: string;
	private func: NitricFunction;
	private region: string;

	constructor({ gcpProject, stackName, func, region }: PushImageOptions) {
		super(`${func.name}`);
		this.gcpProject = gcpProject;
		this.stackName = stackName;
		this.func = func;
		this.region = region;
	}

	async do(): Promise<void> {
		this.update('Initialising Clients');
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});

		const gcrRegion = getGcrHost(this.region);

		const docker = new Docker();
		const authClient = await auth.getClient();
		const tag = getTagNameForFunction(this.stackName, 'gcp', this.func);
		const image = docker.getImage(tag);
		// TODO: Enable different region storage
		const gcrTag = `${gcrRegion}/${this.gcpProject}/${tag}`;

		await image.tag({
			repo: gcrTag,
			// Always the latest version???
			// name: tag,
		});

		const taggedImg = docker.getImage(gcrTag);
		const { token } = await authClient.getAccessToken();

		const push = await taggedImg.push({
			name: gcrTag,
			authconfig: {
				username: 'oauth2accesstoken',
				password: token,
				// TODO: Enable different region storage
				serveraddress: `https://${gcrRegion}`,
			},
		});

		await new Promise((resolve, rej) => {
			docker.modem.followProgress(
				push,
				(err: Error, res: any) => (err ? rej(err) : resolve(res)),
				(evt: any) => this.update(dockerodeEvtToString(evt)),
			);
		});
	}
}

interface DeployOptions extends CommonOptions {
	stack: NitricStack;
	region: string;
}

export class Deploy extends Task<void> {
	private stack: NitricStack;
	private gcpProject: string;
	private region: string;

	constructor({ stack, gcpProject, region }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.gcpProject = gcpProject;
		this.region = region;
	}

	async do(): Promise<void> {
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();

		const dmClient = new deploymentmanager_v2beta.Deploymentmanager({
			auth: authClient,
		});

		this.update('Describing functions for Google Deployment Manager');
		let resources: any[] = [];
		let outputs: any[] = [];

		const { stack, gcpProject, region } = this;

		// Finally functions and subscriptions
		if (stack.functions) {
			resources = [
				...resources,
				...stack.functions.reduce(
					(acc, func) => [...acc, ...generateFunctionResources(gcpProject, stack.name, func, region)],
					[] as any[],
				),
			];

			outputs = [
				...outputs,
				...stack.functions.reduce((acc, func) => [...acc, ...generateFunctionOutputs(func)], [] as any[]),
			];
		}

		if (stack.buckets) {
			this.emit('update', 'Compiling buckets');
			// Build topics from stack
			resources = [
				...resources,
				...stack.buckets.reduce((acc, bucket) => [...acc, ...generateBucketResources(stack.name, bucket)], [] as any[]),
			];
		}

		if (stack.topics) {
			this.emit('update', 'Compiling topics');
			// Build topics from stack
			resources = [
				...resources,
				...stack.topics.reduce((acc, topic) => [...acc, ...generateTopicResources(topic)], [] as any[]),
			];
		}

		this.update('Checking if deployment already exists');
		let existingDeployment: deploymentmanager_v2beta.Schema$Deployment | undefined = undefined;

		try {
			const { data } = await dmClient.deployments.get({
				project: gcpProject,
				deployment: sanitizeStringForDockerTag(stack.name),
			});
			existingDeployment = data;
		} catch (error) {
			this.update('Stack does not already exist');
		}

		let operation: deploymentmanager_v2beta.Schema$Operation;

		if (existingDeployment) {
			this.update(`Updating existing stack ${stack.name}`);
			operation = (
				await dmClient.deployments.update({
					project: gcpProject,
					deployment: sanitizeStringForDockerTag(stack.name),
					deletePolicy: 'DELETE',
					requestBody: {
						name: sanitizeStringForDockerTag(stack.name),
						fingerprint: existingDeployment.fingerprint,
						target: {
							config: {
								content: yaml.stringify({
									resources,
									outputs,
								}),
							},
						},
					},
				})
			).data;
		} else {
			this.update('Pushing stack to Google Cloud Deployment Manager');
			operation = (
				await dmClient.deployments.insert({
					project: gcpProject,
					requestBody: {
						name: sanitizeStringForDockerTag(stack.name),
						target: {
							config: {
								content: yaml.stringify({
									resources,
									outputs,
								}),
							},
						},
					},
				})
			).data;
		}

		this.update(`Waiting for deployment to finish`);
		await operationToPromise(gcpProject, operation);

		// TODO: Check deployment status
		this.update(`Deployment finished`);
	}
}

/**
 * Deploy Subscriptions
 */
export class DeploySubscriptions extends Task<void> {
	private stack: NitricStack;
	private project: string;
	private region: string;

	constructor({ gcpProject, region, stack }: DeployOptions) {
		super('Deploying Topic Subscriptions');
		this.stack = stack;
		this.project = gcpProject;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, project, region } = this;
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();

		const dmClient = new deploymentmanager_v2beta.Deploymentmanager({
			auth: authClient,
		});

		this.update('Describing internal service accounts');
		const iam = await generateIamServiceAccounts(project, stack.name);

		this.update('Describing topic subscriptions');
		const subscriptions = (
			await Promise.all(stack.functions!.map((func) => generateSubscriptionsForFunction(project, region, func)))
		).reduce((acc, subs) => [...acc, ...subs], [] as any[]);

		this.update('Deploying subscriptions');
		const { data: operation } = await dmClient.deployments.insert({
			project,
			requestBody: {
				name: `${sanitizeStringForDockerTag(stack.name)}-subscriptions`,
				target: {
					config: {
						content: yaml.stringify({
							resources: [...iam, ...subscriptions],
						}),
					},
				},
			},
		});

		this.update(`Waiting for deployment to finish`);
		await operationToPromise(project, operation);
	}
}

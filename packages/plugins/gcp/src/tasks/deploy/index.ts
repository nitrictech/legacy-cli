import { deploymentmanager_v2beta, google } from 'googleapis';
import {
	Task,
	NitricFunction,
	NitricStack,
	sanitizeStringForDockerTag,
	getTagNameForFunction,
	dockerodeEvtToString,
} from '@nitric/cli-common';
import generateFunctionResources from './functions';
import generateTopicResources from './topics';
import generateBucketResources from './buckets';
import generateSubscriptionsForFunction from './subscriptions';
import generateIamServiceAccounts from './invoker';
import Docker from 'dockerode';
import yaml from 'yaml';
import { operationToPromise } from '../utils';
import { getGcrHost } from './regions';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface CommonOptions {
	gcpProject: string;
}

const PROJECT_NAME = 'nitric-gcp';

const ensurePlugins = async (): Promise<void> => {
	const ws = await LocalWorkspace.create({});
	await ws.installPlugin('gcp', 'v4.2.1');
};

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
		const tag = getTagNameForFunction(this.stackName, this.func);
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
		this.update('Checking plugins');
		await ensurePlugins();

		this.update('Describing functions for Google Deployment Manager');
		let resources: { [key: string]: any } = {};

		const { stack, gcpProject, region } = this;

		// Finally functions and subscriptions

		this.update('Checking if deployment already exists');
		try {
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				projectName: PROJECT_NAME,
				stackName: stack.name,

				program: async () => {
					if (stack.functions) {
						resources = {
							...resources,
							...stack.functions.reduce(
								(acc, func) => ({
									...acc,
									...generateFunctionResources(gcpProject, stack.name, func, region),
								}),
								{},
							),
						};
					}

					if (stack.buckets) {
						this.emit('update', 'Compiling buckets');
						// Build topics from stack
						resources = {
							...resources,
							...stack.buckets.reduce(
								(acc, bucket) => ({ ...acc, ...generateBucketResources(stack.name, bucket) }),
								{},
							),
						};
					}

					if (stack.topics) {
						this.emit('update', 'Compiling topics');
						// Build topics from stack
						resources = {
							...resources,
							...stack.topics.reduce((acc, topic) => ({ ...acc, ...generateTopicResources(topic) }), {}),
						};
					}
				},
			});

			await pulumiStack.setAllConfig({
				'gcp:project': { value: gcpProject },
				'gcp:region': { value: region },
			});

			await pulumiStack.up({ onOutput: this.update.bind(this) });
		} catch (error) {
			throw new Error(`Error: ${JSON.stringify(error)}`);
		}

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
		let { data: operation } = await dmClient.deployments.insert({
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

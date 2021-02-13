import { google } from 'googleapis';
import { Task, NitricFunction, NitricStack, getTagNameForFunction, dockerodeEvtToString } from '@nitric/cli-common';
import { createFunction } from './functions';
import { createTopic } from './topics';
import { createBucket } from './buckets';
import { createSchedule } from './schedule';
import { createApi } from './apis';
import Docker from 'dockerode';
import { getGcrHost } from './regions';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

interface CommonOptions {
	gcpProject: string;
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
		const { stack, gcpProject, region } = this;
		const { functions = [], buckets = [], apis = [], topics = [], schedules = [] } = stack;

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				stackName: stack.name,
				projectName: stack.name,
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// deploy the buckets
						buckets.map(createBucket);
						// Deploy the topics
						const deployedTopics = topics.map(createTopic);
						// deploy the functions
						const deployedFunctions = functions.map((f) =>
							createFunction(gcpProject, stack.name, region, f, deployedTopics),
						);
						// deploy the schedules
						schedules.map((s) => createSchedule(s, deployedTopics));
						// deploy apis
						apis.map((a) => createApi(a, deployedFunctions));
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

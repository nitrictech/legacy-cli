import { apigateway_v1beta, deploymentmanager_v2beta, google, run_v1 } from 'googleapis';
import {
	Task,
	NitricFunction,
	NitricStack,
	sanitizeStringForDockerTag,
	getTagNameForFunction,
	dockerodeEvtToString,
} from '@nitric/cli-common';
import { DeployedFunction } from './types';
import generateFunctionResources, { generateFunctionOutputs } from './functions';
import generateTopicResources from './topics';
import generateBucketResources from './buckets';
import generateSubscriptionsForFunction from './subscriptions';
import generateIamServiceAccounts from './invoker';
import generateSchedules from './schedule';
import { createAPI, createAPIGateway } from './apis';
import Docker from 'dockerode';
import yaml from 'yaml';
import { operationToPromise } from '../utils';
import { getGcrHost } from './regions';
import { apigateway } from 'googleapis/build/src/apis/apigateway';

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
			"nitric-cloud-apigateway": {
				description: 'Type provider for deploying service to api gateway',
				descriptorUrl: 'https://apigateway.googleapis.com/$discovery/rest?version=v1',
				name: 'nitric-cloud-apigateway',
				options: {
					inputMappings: [
						{
							fieldName: 'Authorization',
							location: 'HEADER',
							value: '$.concat("Bearer ", $.googleOauth2AccessToken())',
						},
						// {
						// 	fieldName: 'name',
						// 	location: 'PATH',
						// 	// methodMatch: '^delete$',
						// 	value: '$.concat($.resource.properties.parent, "/services/", $.resource.properties.metadata.name)',
						// },
						// {
						// 	fieldName: 'parent',
						// 	location: 'PATH',
						// 	// methodMatch: '^delete$',
						// 	value: '$.resource.properties.parent',
						// },
					],
				},
			}
		}

		const existingTypeProviderNames = (typeProviders || []).map(({ name }) => name as string);

		await Promise.all(Object.keys(tps).map(async (tp) => {
			if (existingTypeProviderNames.includes(tp)) {
				this.update(`Updating existing type provider ${tp}`);
				await dmClient.typeProviders.update({
					project: this.gcpProject,
					typeProvider: tp,
					requestBody: tps[tp],
				});
			} else {
				await dmClient.typeProviders.insert({
					project: this.gcpProject,
					requestBody: tps[tp],
				});
			}
		}));
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

		if (stack.schedules) {
			this.emit('update', 'Compiling schedules');
			// Build schedules from stack
			resources = [
				...resources,
				...stack.schedules.reduce((acc, schedule) => [...acc, ...generateSchedules(gcpProject,  schedule, region)], [] as any[]),
			];
		}

		if (stack.apis) {
			this.update('Compiling API');
			resources = [
				...resources,
				...createAPI(stack.name, this.gcpProject)
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

async function getStackAPI(stackName: string, project: string): Promise<apigateway_v1beta.Schema$ApigatewayApi> {
	const auth = new google.auth.GoogleAuth({
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const authClient = await auth.getClient();

	const apiClient = new apigateway_v1beta.Apigateway({
		auth: authClient,
	});

	let data = {
		state: "UNSPECIFIED"
	} as apigateway_v1beta.Schema$ApigatewayApi;
	while (data.state !== "ACTIVE") {
		try {
			const { data: tmpData } = await apiClient.projects.locations.apis.get({
				name: `projects/${project}/locations/global/apis/${stackName}-api`
			});

			// apiClient.projects.locations.apis.configs.create({
			// 	apiConfigId: "",
			// 	requestBody: {
			// 		openapiDocuments: [{
			// 			document: {
			// 				path: "",
			// 				contents: ""
			// 			}
			// 		}]
			// 	}
			// })
	
			data = tmpData;
	
			if (data.state !== "ACTIVE") {
				// wait a bit and try again
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		} catch (e) {
			console.log("There was an error... continuing...")
		}
	}

	return data;
}

// 
async function getDeployedFunctions(project: string, region: string, funcs: NitricFunction[]): Promise<DeployedFunction[]> {
	const auth = new google.auth.GoogleAuth({
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const authClient = await auth.getClient();

	const runClient = new run_v1.Run({
		auth: authClient,
	});

	const deployedFunctions = await Promise.all(funcs.map(async f => {
		let endpoint = null as string | null | undefined;

		// TODO: Add retry limit...
		while (!endpoint) {
			const service = (
				await runClient.projects.locations.services.get({
					name: `projects/${project}/locations/${region}/services/${sanitizeStringForDockerTag(f.name)}`,
				})
			).data;

			endpoint = service.status ? service.status.url : undefined;

			if (!endpoint) {
				// wait a bit and try again
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return {
			...f,
			endpoint,
		} as DeployedFunction;
	}));

	return deployedFunctions;
}

/**
 * Deploy Subscriptions
 */
export class DeploySubscriptions extends Task<void> {
	private stack: NitricStack;
	private project: string;
	private region: string;

	constructor({ gcpProject, region, stack }: DeployOptions) {
		super('Deploying Interfaces');
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


		this.update('Waiting for functions and API to deploy');
		const [deployedFunctions, api] = await Promise.all([getDeployedFunctions(project, region, stack.functions!), getStackAPI(stack.name, project)]);

		// const deployedFunctions = await getDeployedFunctions(project, region, stack.functions!);
		// const api = await getStackAPI(stack.name, project)

		this.update('Describing internal service accounts');
		const iam = generateIamServiceAccounts(project, stack.name);

		this.update('Describing topic subscriptions');
		const subscriptions = (
			deployedFunctions.map((func) => generateSubscriptionsForFunction(project, func))
		).reduce((acc, subs) => [...acc, ...subs], [] as any[]);

		this.update('Describing API Gateway');
		let apiResources = [] as any[];
		if (stack.apis) {
			apiResources = await createAPIGateway(stack.name, region, project, api.name!, stack.apis, deployedFunctions);
		}
		

		this.update('Deploying subscriptions');
		const { data: operation } = await dmClient.deployments.insert({
			project,
			requestBody: {
				name: `${sanitizeStringForDockerTag(stack.name)}-interfaces`,
				target: {
					config: {
						content: yaml.stringify({
							resources: [...iam, ...subscriptions, ...apiResources],
						}),
					},
				},
			},
		});

		this.update(`Waiting for deployment to finish`);
		await operationToPromise(project, operation);
	}
}

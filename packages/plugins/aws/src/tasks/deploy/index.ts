import {
	dockerodeEvtToString,
	NitricStack,
	getTagNameForFunction,
	// normalizeFunctionName,
	normalizeStackName,
	// normalizeTopicName,
	Task,
	NitricFunction,
} from '@nitric/cli-common';
import Docker from 'dockerode';
import AWS from 'aws-sdk';
import { CreateStackInput, Stack, UpdateStackInput } from 'aws-sdk/clients/cloudformation';
import {
	generateEcrRepositoryUri,
	// generateLBListenerKey,
	// generateLoadBalancerKey
} from '../../common/utils';
// import createSecurityGroup from './security-group';
// import createContainer from './container';
import createLambda, { createLambdaFunction } from './lambda';
import createEventRule, { createSchedule } from './eb-rule';
import { createApi } from './api';
// import createLoadBalancer from './load-balancer';
import { createTopic } from './topic';
import fs from 'fs';

import {
	LocalWorkspace,
	ConcurrentUpdateError,
	StackAlreadyExistsError,
	StackNotFoundError
} from "@pulumi/pulumi/x/automation";

/**
 * Common Task Options
 */
interface CommonOptions {
	account: string;
	region: string;
}

/**
 * Push Image Task Options
 */
interface PushImageOptions extends CommonOptions {
	stackName: string;
	func: NitricFunction;
}

/**
 * Pushes an image to AWS ECR
 */
export class PushImage extends Task<void> {
	private stackName: string;
	private func: NitricFunction;
	private account: string;
	private region: string;

	constructor({ stackName, func, account, region }: PushImageOptions) {
		super(`${func.name}`);
		this.stackName = stackName;
		this.func = func;
		this.account = account;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stackName, func, account, region } = this;
		// Set region
		AWS.config.update({ region });
		const ecr = new AWS.ECR();
		// TODO: Consider moving this to a common module, it's a duplicate of the GCP
		const docker = new Docker();
		const imageAlias = getTagNameForFunction(stackName, 'aws', func);
		const image = docker.getImage(imageAlias); //TODO: this assumes [imageAlias]:latest should we support other tags?

		const repoUri = generateEcrRepositoryUri(account, region, stackName, func);

		// Ensure the image repository already exists
		try {
			await ecr.describeRepositories({ repositoryNames: [imageAlias] }).promise();
			this.update(`Found repository: ${repoUri}`);
		} catch (error) {
			if (error.name === 'RepositoryNotFoundException') {
				// Create the image repository
				this.update(`Creating new repository: ${repoUri}`);
				await ecr.createRepository({ repositoryName: imageAlias }).promise();
			} else {
				// Unexpected error, other than repo missing
				throw error;
			}
		}

		// Get auth details for AWS ECR
		const tokenResponse = await ecr.getAuthorizationToken({}).promise();
		if (!tokenResponse.authorizationData) {
			throw new Error('Unable to authenticate with AWS ECR, data missing in response to authentication request.');
		}
		const auth = tokenResponse.authorizationData[0];
		const [username, password] = Buffer.from(auth.authorizationToken!, 'base64').toString('utf-8').split(':');

		// Tag the image with the repository URI
		await image.tag({
			repo: repoUri,
		});
		const taggedImg = docker.getImage(repoUri);

		// Push the tagged image to ECR
		const push = await taggedImg.push({
			name: imageAlias,
			authconfig: {
				username,
				password,
				serveraddress: auth.proxyEndpoint,
			},
		});

		// Track and wait for the image push to complete
		await new Promise((resolve, rej) => {
			docker.modem.followProgress(
				push,
				(err: Error, res: any) => (err ? rej(err) : resolve(res)),
				(evt: any) => {
					this.update(dockerodeEvtToString(evt));
				},
			);
		});
	}
}
/**
 * Deploy Task Options
 */
interface DeployOptions extends CommonOptions {
	stack: NitricStack;
	// vpc: string;
	// cluster: string;
	// subnets: string[];
}

/**
 * Deploys the given Nitric Stack to AWS as a CloudFormation Stack
 */
export class Deploy extends Task<void> {
	private stack: NitricStack;
	private account: string;
	private region: string;
	// private vpc: string;
	// private cluster: string;
	// private subnets: string[];

	constructor({ stack, account, region }: DeployOptions) {
		super('Deploying Nitric Stack');
		this.stack = stack;
		this.account = account;
		this.region = region;
		//TODO: Just generate the dang VPC and get rid of these three things.
		// this.vpc = vpc;
		// this.cluster = cluster;
		// this.subnets = subnets;
	}

	async do(): Promise<void> {
		const { stack, account, region } = this;
		const { functions = [], topics = [], schedules = [], apis = [] } = stack;

		this.update('Defining functions');

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
					stackName: stack.name,
					projectName: stack.name,
					// generate our pulumi program on the fly from the POST body
					program: async () => {
						// Now we can start deploying with Pulumi
						try {
							// Create topics
							// There are a few dependencies on this
							const deployedTopics = topics.map(createTopic);

							// Deploy schedules
							schedules.map(schedule => createSchedule(schedule, deployedTopics));

							const deployedFunctions = functions.map(func => 
								createLambdaFunction(stack.name, func, deployedTopics, account, region)
							);
			
							// Deploy APIs
							apis.map(api => createApi(api, deployedFunctions));
						} catch (e) {
							throw e;
						}
					},
			});
			await pulumiStack.setConfig("aws:region", { value: region });
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({ onOutput: this.update.bind(this) });

			console.log(upRes);
		} catch(e) {
			console.log(e);
		}
	}
}

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
import createLambda from './lambda';
import createEventRule from './eb-rule';
// import createLoadBalancer from './load-balancer';
import createTopic from './topic';
import fs from 'fs';

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
		// let resources: any[] = [];
		const { functions = [], topics = [], schedules = [], } = stack;

		AWS.config.update({ region });

		// TODO: Add VPC Security Group
		// TODO: Add VPC Subnet and assign to Services
		// TODO: Add Load Balancer
		// TODO: Load Balancer Listener
		// TODO: Load Balancer Listerner Rule
		// TODO: Add or Reuse Cluster
		this.update('Defining functions');
		const resources = {
			// ...resources,
			// ...createSecurityGroup(vpc, stack.name),
			// ...createLoadBalancer(stack.name, subnets),
			...functions.reduce(
				(defs, func) => ({
					...defs,
					...createLambda(
						stack.name,
						func,
						account,
						region,
						// vpc,
						// subnets,
						// cluster,
						// generateLoadBalancerKey(stack.name),
						// // Using index of function as load balancer priority.
						// // none of the rules overlap, so this isn't important, but it's required by AWS.
						// index + 1,
						// generateLBListenerKey(stack.name),
					),
				}),
				{},
			),
			...topics.reduce(
				(defs, topic) => ({
					...defs,
					...createTopic(topic),
				}),
				{},
			),
			...schedules.reduce(
				(defs, schedule) => ({
					...defs,
					...createEventRule(schedule),
				}),
				{},
			)
		};

		// TODO: are there types to protect this? i.e. is 'resources' valid
		const template = {
			AWSTemplateFormatVersion: '2010-09-09',
			Description: `Generated by Nitric - ${new Date().toUTCString()}`,
			Resources: resources,
		};

		fs.writeFileSync('./cloudformation.json', JSON.stringify(template, null, 2));

		const awsStackName = normalizeStackName(stack); //TODO: validate stack name against regex ^[a-zA-Z][-a-zA-Z0-9]*$
		if (!/^[a-zA-Z][-a-zA-Z0-9]*$/.test(awsStackName)) {
			throw new Error(`Invalid Stack Name: ${stack.name}. Stack names must start with a letter.`);
		}

		const cloudformation = new AWS.CloudFormation();
		this.update('Checking if CloudFormation stack already exists');
		let existingStack: Stack | undefined = undefined;

		try {
			const stackDescription = await cloudformation.describeStacks({ StackName: awsStackName }).promise();
			existingStack = stackDescription.Stacks![0];
		} catch (error) {
			this.update('CloudFormation stack not found');
		}

		const params: CreateStackInput | UpdateStackInput = {
			StackName: awsStackName,
			TemplateBody: JSON.stringify(template),
			Capabilities: [
				'CAPABILITY_IAM', //TODO: Determine whether this is needed for updates too. Also, may want to confirm with CLI user first too.
			],
		};

		let completeStatus = 'CREATE_COMPLETE';
		if (existingStack) {
			// Update the new stack with CloudFormation
			this.update('Updating existing CloudFormation stack');
			try {
				await cloudformation.updateStack(params).promise();
				completeStatus = 'UPDATE_COMPLETE';
			} catch (error) {
				if (error.code === 'ValidationError' && error.message === 'No updates are to be performed.') {
					this.update('No stack changes detected, cancelling stack deployment');
					return; // No need to wait for 'COMPLETE' status
				}
			}
		} else {
			// Create the new stack with CloudFormation
			this.update('Creating new CloudFormation stack');
			await cloudformation.createStack(params).promise();
		}

		// Poll and wait for the deployment to complete
		const waitForComplete = async (res, rej): Promise<any> => {
			try {
				const stackDescription = await cloudformation.describeStacks({ StackName: awsStackName }).promise();
				if (stackDescription.Stacks![0].StackStatus === completeStatus) {
					res(stackDescription.Stacks![0].StackStatus);
				} else {
					this.update('Stack Status: ' + stackDescription.Stacks![0].StackStatus);
					setTimeout(() => {
						waitForComplete(res, rej);
					}, 10000);
				}
			} catch (error) {
				rej(error);
			}
		};
		await new Promise(waitForComplete);
		const stackOutput = await cloudformation.describeStacks().promise();
		console.log('Stack Output:', JSON.stringify(stackOutput, null, 2));
	}
}

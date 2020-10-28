import {
	dockerodeEvtToString,
	NitricStack,
	getTagNameForFunction,
	normalizeFunctionName,
	normalizeStackName,
	normalizeTopicName,
	Task,
	NitricFunction,
} from '@nitric/cli-common';
import Docker from 'dockerode';
import AWS from 'aws-sdk';
import { CreateStackInput, Stack, UpdateStackInput } from 'aws-sdk/clients/cloudformation';
import { generateEcrRepositoryUri } from '../../common/utils';

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
		const imageAlias = getTagNameForFunction(stackName, func);
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
}
/**
 * Deploys the given Nitric Stack to AWS as a CloudFormation Stack
 */
export class Deploy extends Task<void> {
	private stack: NitricStack;
	private account: string;
	private region: string;

	constructor({ stack, account, region }: DeployOptions) {
		super('Deploying Nitric Stack');
		this.stack = stack;
		this.account = account;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, account, region } = this;
		let resources: any[] = [];

		AWS.config.update({ region });

		// TODO: Add VPC Security Group
		// TODO: Add VPC Subnet and assign to Services
		// TODO: Add Load Balancer
		// TODO: Load Balancer Listener
		// TODO: Load Balancer Listerner Rule
		// TODO: Add or Reuse Cluster

		if (stack.functions) {
			this.update('Defining functions');
			resources = {
				...resources,
				...stack.functions.reduce((taskDefs, func) => {
					const funcName = normalizeFunctionName(func);
					const containerName = funcName;
					const taskName = funcName + 'Task';
					const taskDefName = taskName + 'Def';
					const serviceName = funcName + 'Service';
					const serviceDefName = serviceName + 'Def';

					return {
						...taskDefs,
						// Define the ECS task for this function
						[taskDefName]: {
							Type: 'AWS::ECS::TaskDefinition',
							Properties: {
								NetworkMode: 'awsvpc',
								ExecutionRoleArn: 'ecsTaskExecutionRole', //TODO: From config or create ourselves
								ContainerDefinitions: [
									{
										Name: containerName,
										// Cpu: "",
										// Memory: "",
										Image: generateEcrRepositoryUri(account, region, stack.name, func),
										PortMappings: [
											{
												ContainerPort: 9001,
												HostPort: 9001,
											},
										],
										LogConfiguration: {
											LogDriver: 'awslogs',
											Options: {
												// TODO: generate log options from config
												'awslogs-group': 'nitric-test',
												'awslogs-region': region,
												'awslogs-stream-prefix': 'nitric-prefix',
											},
										},
									},
								],
								Cpu: '256', //TODO: allocate this from config
								Memory: '512', //TODO: allocate this from config
								RequiresCompatibilities: ['FARGATE'],
							},
						},
						// Define the ECS service for this function
						[serviceDefName]: {
							Type: 'AWS::ECS::Service',
							Properties: {
								ServiceName: serviceName,
								Cluster: 'nitric-test', // TODO: generate or pull from config
								LaunchType: 'FARGATE',
								DesiredCount: 1,
								NetworkConfiguration: {
									AwsvpcConfiguration: {
										AssignPublicIp: 'ENABLED',
										Subnets: ['subnet-1bf84844'], // TODO: generate or pull from config
									},
								},
								TaskDefinition: {
									Ref: taskDefName,
								},
							},
						},
					};
				}, {}),
			};
		}

		if (stack.topics) {
			this.update('Defining Topics');
			resources = {
				...resources,
				...stack.topics.reduce((topics, topicDef) => {
					const topicName = normalizeTopicName(topicDef);
					const topicDefName = topicName + 'Def';

					return {
						...topics,
						[topicDefName]: {
							Type: 'AWS::SNS::Topic',
							Properties: {
								DisplayName: topicName,
								// Subscription: [
								// 	{
								// 		Endpoint: "http:example.com",
								// 		Protocol: "http",
								// 	},
								// ],
							},
						},
					};
				}, {}),
			};
		}

		// TODO: are there types to protect this? i.e. is 'resources' valid
		const template = {
			AWSTemplateFormatVersion: '2010-09-09',
			Description: `Generated by Nitric - ${new Date().toUTCString()}`,
			Resources: resources,
		};

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
	}
}

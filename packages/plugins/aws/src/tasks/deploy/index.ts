import { Task, Stack } from '@nitric/cli-common';
// import createSecurityGroup from './security-group';
// import createContainer from './container';
import { createLambdaFunction } from './lambda';
import { createSchedule } from './eb-rule';
import { createApi } from './api';
// import createLoadBalancer from './load-balancer';
import { createTopic } from './topic';

import { LocalWorkspace } from '@pulumi/pulumi/x/automation';
import { ecr } from '@pulumi/aws';

/**
 * Common Task Options
 */
interface CommonOptions {
	account: string;
	region: string;
}

/**
 * Deploy Task Options
 */
interface DeployOptions extends CommonOptions {
	stack: Stack;
	// vpc: string;
	// cluster: string;
	// subnets: string[];
}

/**
 * Deploys the given Nitric Stack to AWS as a CloudFormation Stack
 */
export class Deploy extends Task<void> {
	private stack: Stack;
	private region: string;
	// private vpc: string;
	// private cluster: string;
	// private subnets: string[];

	constructor({ stack, region }: DeployOptions) {
		super('Deploying Nitric Stack');
		this.stack = stack;
		this.region = region;
		// TODO: Just generate the dang VPC and get rid of these three things.
		// this.vpc = vpc;
		// this.cluster = cluster;
		// this.subnets = subnets;
	}

	async do(): Promise<void> {
		const { stack, region } = this;
		const { topics = [], schedules = [], apis = [] } = stack.asNitricStack();

		this.update('Defining functions');

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				stackName: stack.getName(),
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						const authToken = await ecr.getAuthorizationToken();
						// Create topics
						// There are a few dependencies on this
						const deployedTopics = (topics || []).map(createTopic);

						// Deploy schedules
						(schedules || []).forEach((schedule) => createSchedule(schedule, deployedTopics));

						const deployedFunctions = stack
							.getFunctions()
							.map((func) => createLambdaFunction(func, deployedTopics, authToken));

						// Deploy APIs
						(apis || []).map((api) => createApi(api, deployedFunctions));
					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			});
			await pulumiStack.setConfig('aws:region', { value: region });
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({ onOutput: this.update.bind(this) });

			console.log(upRes);
		} catch (e) {
			console.log(e);
		}
	}
}

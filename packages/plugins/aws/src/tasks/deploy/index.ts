import { Task, Stack } from '@nitric/cli-common';
// import createSecurityGroup from './security-group';
// import createContainer from './container';
import { createLambdaFunction } from './lambda';
import { createSchedule } from './eb-rule';
import { createApi } from './api';
// import createLoadBalancer from './load-balancer';
import { createTopic } from './topic';
import * as pulumi from '@pulumi/pulumi';

import { LocalWorkspace } from '@pulumi/pulumi/automation';
import { ecr } from '@pulumi/aws';
import { createSite } from './site';
import { createEntrypoints } from './entrypoint';
import fs from 'fs';

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
 * Deploys the given Nitric Stack
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
		const { topics = [], schedules = [], apis = [], entrypoints } = stack.asNitricStack();

		this.update('Defining functions');

		try {
			// Upload the stack
			const logFile = await stack.getLoggingFile('deploy:aws');
			const errorFile = await stack.getLoggingFile('error:aws');

			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				// TODO: Incorporate additional stack detail. E.g. dev/test/prod
				stackName: 'aws',
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

						const deployedSites = await Promise.all(stack.getSites().map(createSite));

						const deployedFunctions = stack
							.getFunctions()
							.map((func) => createLambdaFunction(func, deployedTopics, authToken));

						// Deploy APIs
						const deployedApis = (apis || []).map((api) => createApi(api, deployedFunctions));

						if (entrypoints) {
							createEntrypoints(stack.getName(), entrypoints, deployedSites, deployedApis, deployedFunctions);
						}
					} catch (e) {
						fs.appendFileSync(errorFile, e);
						pulumi.log.error(e);
					}
				},
			});
			await pulumiStack.setConfig('aws:region', { value: region });
			const update = this.update.bind(this);
			// deploy the stack, tailing the logs to console
			const upRes = await pulumiStack.up({
				onOutput: (out: string) => {
					update(out);
					fs.appendFileSync(logFile, out);
				},
			});

			if (upRes.summary && upRes.summary.resourceChanges) {
				const changes = Object.entries(upRes.summary.resourceChanges)
					.map((entry) => entry.join(': '))
					.join(', ');
				this.update(changes);
			}
		} catch (e) {
			console.log(e);
		}
	}
}

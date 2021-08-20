// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { flags } from '@oclif/command';
import { Deploy, DeployResult, DEPLOY_TASK_KEY } from '../../tasks/deploy';
import { BaseCommand, wrapTaskForListr, Stack, constants, createBuildListrTask } from '@nitric/cli-common';
import { Listr } from 'listr2';
import cli from 'cli-ux';
import path from 'path';
import { google } from 'googleapis';
import inquirer from 'inquirer';

// XXX: Commented out regions do not support Cloud Run
const SUPPORTED_REGIONS = [
	// 'us-west1', // Api gateway not supported
	'us-west2',
	'us-west3',
	'us-west4',
	'us-central1',
	'us-east1',
	'us-east4',
	// 'northamerica-northeast1', // Api gateway not supported
	// 'southamerica-east1', // Api gateway not supported
	'europe-west1',
	'europe-west2',
	// 'europe-west4', // Api gateway not supported
	// 'europe-west6' // Api gateway not supported
	// 'europe-west3' // Api gateway not supported
	// 'europe-north1', // Api gateway not supported
	// 'asia-south1', // Api gateway not supported
	// 'asia-southeast1', // Api gateway not supported
	// 'asia-southeast2', // Api gateway not supported
	// 'asia-east2', // Api gateway not supported
	'asia-east1',
	// 'asia-northeast1', // Api gateway not supported
	// 'asia-northeast2', // Api gateway not supported
	// 'asia-northeast3', // Api gateway not supported
	// 'asia-southeast1', // Api gateway not supported
	'australia-southeast1',
];

const BaseFlags = {
	project: flags.string({
		char: 'p',
		description: 'GCP project ID to deploy to (default: locally configured account)',
	}),
	region: flags.enum({
		options: SUPPORTED_REGIONS,
		char: 'r',
		description: 'gcp region to deploy to',
	}),
	file: flags.string({
		char: 'f',
		default: 'nitric.yaml',
	}),
};

export default class GcpDeploy extends BaseCommand {
	static description = 'deploy a stack to Google Cloud Platform (GCP)';

	static examples = [`$ nitric deploy:gcp`];

	static flags: typeof BaseFlags &
		typeof BaseCommand.flags &
		flags.Input<{
			nonInteractive: boolean;
		}> = {
		...BaseCommand.flags,
		...BaseFlags,
		nonInteractive: flags.boolean({
			default: false,
			char: 'n',
		}),
	};

	static args = [{ name: 'dir' }];

	async do(): Promise<void> {
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const derivedProject = (await auth.getClient()).projectId;
		const { args, flags } = this.parse(GcpDeploy);
		const { nonInteractive } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(GcpDeploy.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = GcpDeploy.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				}
				return prompt;
			});

		let promptFlags = {};
		if (!nonInteractive) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { project = derivedProject, file, region } = { ...flags, ...promptFlags };
		const stackDefinitionPath = path.join(dir, file);

		const stack = await Stack.fromFile(stackDefinitionPath);

		if (!region) {
			throw new Error('Region must be provided');
		}

		if (!project) {
			throw new Error('Project must be provided');
		}

		const results = await new Listr<any>(
			[
				createBuildListrTask(stack, 'gcp'),
				wrapTaskForListr(
					new Deploy({
						gcpProject: project,
						stack,
						region,
					}),
				),
			],
			constants.DEFAULT_LISTR_OPTIONS,
		).run();

		const deployResult = results[DEPLOY_TASK_KEY] as DeployResult;

		// Print deployed entrypoint urls to console
		if (deployResult.entrypoints) {
			cli.table(deployResult.entrypoints, {
				entrypoint: {},
				url: {},
			});
		}
	}
}

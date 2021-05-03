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

import { Command, flags } from '@oclif/command';
import { Deploy } from '../../tasks/deploy';
import { wrapTaskForListr, Stack, StageStackTask } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import { google } from 'googleapis';
import inquirer from 'inquirer';

// XXX: Commented out regions do not support cloud run
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

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Google Cloud Platform (GCP)';

	static examples = [`$ nitric deploy:gcp`];

	static flags = {
		project: flags.string({
			char: 'p',
			description: 'GCP project ID to deploy to (default: locally configured account)',
		}),
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'gcp region to deploy to',
		}),
		guided: flags.boolean({ default: false }),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		help: flags.help({ char: 'h', default: false }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const derivedProject = (await auth.getClient()).projectId;
		const { args, flags } = this.parse(DeployCmd);
		const { guided } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(DeployCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DeployCmd.flags[key];
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
		if (guided) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { project = derivedProject, file, region } = { ...flags, ...promptFlags };
		const stackDefinitionPath = path.join(dir, file);
		// const stack: NitricStack = (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		const stack = await Stack.fromFile(stackDefinitionPath);

		if (!region) {
			throw new Error('Region must be provided, for prompts use the --guided flag');
		}

		if (!project) {
			throw new Error('Project must be provided, for prompts use the --guided flag');
		}

		new Listr<any>([
			wrapTaskForListr(
				// Stage the stak ready for building...
				new StageStackTask({ stack }),
			),
			wrapTaskForListr(
				new Deploy({
					gcpProject: project,
					stack,
					region,
				}),
			),
		]).run();
	}
}

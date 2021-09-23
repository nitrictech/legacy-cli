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
import { Listr } from 'listr2';
import inquirer from 'inquirer';
import {
	BaseCommand,
	Stack,
	wrapTaskForListr,
	constants,
	createBuildListrTask,
	checkDockerDaemon,
} from '@nitric/cli-common';
import path from 'path';
import { Deploy } from '../../tasks/deploy';
import { AppServicePlan } from '../../types';

const SUPPORTED_REGIONS = [
	'eastus',
	'eastus2',
	'southcentralus',
	'westus2',
	'australiaeast',
	'southeastasia',
	'northeurope',
	'uksouth',
	'westeurope',
	'centralus',
	'northcentralus',
	'westus',
	'southafricanorth',
	'centralindia',
	'eastasia',
	'japaneast',
	'koreacentral',
	'canadacentral',
	'francecentral',
	'germanywestcentral',
	'norwayeast',
	'switzerlandnorth',
	'uaenorth',
	'brazilsouth',
	'centralusstage',
	'eastusstage',
	'eastus2stage',
	'northcentralusstage',
	'southcentralusstage',
	'westusstage',
	'westus2stage',
	'asia',
	'asiapacific',
	'australia',
	'brazil',
	'canada',
	'europe',
	'global',
	'india',
	'japan',
	'uk',
	'unitedstates',
	'eastasiastage',
	'southeastasiastage',
	'centraluseuap',
	'eastus2euap',
	'westcentralus',
	'westus3',
	'southafricawest',
	'australiacentral',
	'australiacentral2',
	'australiasoutheast',
	'japanwest',
	'koreasouth',
	'southindia',
	'westindia',
	'canadaeast',
	'francesouth',
	'germanynorth',
	'norwaywest',
	'switzerlandwest',
	'ukwest',
	'uaecentral',
	'brazilsoutheast',
];

const APPSERVICE_PLANS: Record<string, AppServicePlan> = {
	'Free-F1': {
		tier: 'Free',
		size: 'F1',
	},
	'Shared-D1': {
		tier: 'Shared',
		size: 'D1',
	},
	'Basic-B1': {
		tier: 'Basic',
		size: 'B1',
	},
	'Basic-B2': {
		tier: 'Basic',
		size: 'B2',
	},
	'Basic-B3': {
		tier: 'Basic',
		size: 'B3',
	},
	'Standard-S1': {
		tier: 'Standard',
		size: 'S1',
	},
	'Standard-S2': {
		tier: 'Standard',
		size: 'S2',
	},
	'Standard-S3': {
		tier: 'Standard',
		size: 'S3',
	},
};

/**
 * Deploy a stack to Microsoft Azure
 *
 * Note: Azure Deployments are currently a working progress.
 */
export default class AzureDeploy extends BaseCommand {
	static description = 'deploy a stack to Microsoft Azure';

	static examples = [`$ nitric deploy:azure`];

	static flags = {
		...BaseCommand.flags,
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'azure region to deploy to',
		}),
		plan: flags.enum({
			options: Object.keys(APPSERVICE_PLANS),
			char: 'p',
			description: 'azure appservice plan tier',
		}),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
			description: 'stack definition file to deploy',
		}),
		//TODO: provide descriptions for these flags
		orgName: flags.string({}),
		adminEmail: flags.string({}),
	};

	static args = [
		{
			name: 'dir',
			description: 'directory containing the stack to be deployed',
		},
	];

	async do(): Promise<void> {
		// Check docker daemon is running
		checkDockerDaemon('doctor:azure');

		const { args, flags } = this.parse(AzureDeploy);
		const { ci } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(AzureDeploy.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = AzureDeploy.flags[key];
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
		if (!ci) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { file, region, orgName, adminEmail, plan } = { ...flags, ...promptFlags };

		if (!region) {
			throw new Error('Region must be provided, for prompts use the --guided flag');
		}

		if (!orgName) {
			throw new Error('orgName must be provided, for prompts use the --guided flag');
		}

		if (!adminEmail) {
			throw new Error('adminEmail must be provided, for prompts use the --guided flag');
		}

		const stack = await Stack.fromFile(path.join(dir, file));

		new Listr(
			[
				createBuildListrTask(stack, 'azure'),
				wrapTaskForListr(
					new Deploy({
						stack,
						region,
						orgName,
						adminEmail,
						servicePlan: APPSERVICE_PLANS[plan],
					}),
				),
			],
			constants.DEFAULT_LISTR_OPTIONS,
		).run();
	}
}

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
import { BaseCommand, Stack, StageStackTask, wrapTaskForListr } from '@nitric/cli-common';
import path from 'path';
import { Deploy } from '../../tasks/deploy';

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

export default class AzureDeploy extends BaseCommand {
	static description = 'Deploy a Nitric application to Microsoft Azure';

	static examples = [`$ nitric deploy:azure`];

	static flags = {
		...BaseCommand.flags,
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'azure region to deploy to',
		}),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		orgName: flags.string({}),
		adminEmail: flags.string({}),
	};

	static args = [{ name: 'dir' }];

	async do(): Promise<void> {
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

		const { file, region, orgName, adminEmail } = { ...flags, ...promptFlags };

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

		new Listr([
			wrapTaskForListr(new StageStackTask({ stack })),
			wrapTaskForListr(new Deploy({ stack, region, orgName, adminEmail })),
		]).run();
	}
}

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
import { Deploy, DEPLOY_TASK_KEY, DeployResult } from '../../tasks/deploy';
import { BaseCommand, wrapTaskForListr, Stack, StageStackTask, block } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import AWS from 'aws-sdk';
import inquirer from 'inquirer';
import cli from 'cli-ux';

/**
 * Command to deploy a stack to Amazon Web Services Cloud (AWS)
 */
export default class AwsDeploy extends BaseCommand {
	static description = 'deploy a stack to Amazon Web Services (AWS)';

	static examples = [`$ nitric deploy:aws`];

	static flags = {
		...BaseCommand.flags,
		account: flags.string({
			char: 'a',
			description: 'AWS Account ID to deploy to (default: locally configured account)',
		}),
		region: flags.enum({
			char: 'r',
			description: 'AWS Region to deploy to',
			options: [
				'us-east-1',
				'us-west-1',
				'us-west-2',
				'eu-west-1',
				'eu-central-1',
				'ap-southeast-1',
				'ap-northeast-1',
				'ap-southeast-2',
				'ap-northeast-2',
				'sa-east-1',
				'cn-north-1',
				'ap-south-1',
			],
		}),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml' as string,
			description: 'Nitric descriptor file location',
		}),
	};

	static args = [{ name: 'dir', default: '.' }];

	async do(): Promise<any> {
		const { args, flags } = this.parse(AwsDeploy);
		const { dir } = args;
		const sts = new AWS.STS();
		const { Account: derivedAccountId } = await sts.getCallerIdentity({}).promise();

		const prompts = Object.keys(AwsDeploy.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = AwsDeploy.flags[key];
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
		const promptFlags = await inquirer.prompt(prompts);

		const { account, region, file } = { ...flags, ...promptFlags } as Record<keyof typeof flags, string>;

		if (!account && !derivedAccountId) {
			throw new Error(
				'AWS account id must be provided via the -a flag or configured locally (see AWS "Setting Credentials" documentation)',
			);
		}

		const accountId = account || (derivedAccountId as string);
		const stackDefinitionPath = path.join(dir, file);
		const stack = await Stack.fromFile(stackDefinitionPath);

		try {
			const results = await new Listr<any>([
				wrapTaskForListr(new StageStackTask({ stack })),
				wrapTaskForListr(new Deploy({ stack, account: accountId, region })),
			]).run();

			const deployResult = results[DEPLOY_TASK_KEY] as DeployResult;

			if (deployResult.entrypoints) {
				cli.log("Your application entrypoints should be available at:");

				cli.table(deployResult.entrypoints, {
					name: {
						get: ({name}): string => name,
					},
					url: {
						get: ({ url }): string => url,
					},
					domains: {
						get: ({ domains = [] }): string => domains.join(", "),
					}
				});

				cli.log(block`If you have specified any custom domains for these entrypoints you will need to add CNAME records for the hostnames in the urls above`);
			}
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

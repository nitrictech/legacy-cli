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

import { BaseCommand, constants, wrapTaskForListr } from '@nitric/cli-common';
import cli from 'cli-ux';
import { Listr } from 'listr2';
import { CheckPulumiPlugins, InstallAWSPulumiPlugin } from '../../tasks/doctor';

/**
 * Nitric AWS Doctor command
 * Will Check prerequisite software and configurations for deploying to AWS
 */
export default class AwsDoctor extends BaseCommand {
	static description = 'check environment for configuration for deployment to AWS';

	static examples = [`$ nitric doctor:aws`];

	static flags = {
		...BaseCommand.flags,
	};

	static args = [];

	async do(): Promise<void> {
		await new Listr<any>(
			[
				wrapTaskForListr(new CheckPulumiPlugins(), 'installed'),
				wrapTaskForListr({
					name: 'Install AWS Plugin',
					factory: () => new InstallAWSPulumiPlugin(),
					skip: (ctx) => ctx.installed,
				}),
			],
			constants.DEFAULT_LISTR_OPTIONS,
		).run();

		cli.info("Good to go 👍 You're ready to deploy to AWS with Nitric 🎉");
	}
}

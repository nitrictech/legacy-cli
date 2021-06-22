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
import { CheckPulumiPluginTask, InstallPulumiPluginTask } from '../../tasks/doctor';

/**
 * Nitric CLI Azure Doctor command
 * Will check and install prerequisite software for deploying Nitric applications to Azure
 */
export default class AzureDoctor extends BaseCommand {
	static description = 'check environment for configuration for deployment to Azure';

	static examples = [`$ nitric doctor:azure`];

	static flags = {
		...BaseCommand.flags,
	};

	static args = [];

	async do(): Promise<void> {
		await new Listr<any>([
			wrapTaskForListr(new CheckPulumiPluginTask(), 'installed'),
			wrapTaskForListr({
				name: 'Install Azure Plugin',
				factory: () => new InstallPulumiPluginTask(),
				skip: (ctx) => ctx.installed,
			}),
		], constants.DEFAULT_LISTR_OPTIONS).run();

		cli.info("Good to go 👍 You're ready to deploy to Azure with Nitric 🎉");
	}
}

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

import { BaseCommand, wrapTaskForListr } from '@nitric/cli-common';
import { flags } from '@oclif/command';
import cli from 'cli-ux';
import { Listr } from 'listr2';
import { CheckPulumiPluginTask, InstallPulumiPluginTask } from '../../tasks/doctor';

/**
 * Nitric CLI Azure Doctor command
 * Will check and install pre-requisite software for deploying Nitric applications to Azure
 */
export default class Doctor extends BaseCommand {
	static description = 'Checks environment for configuration for deployment to Azure';

	static examples = [`$ nitric doctor:azure`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		await new Listr<any>([
			wrapTaskForListr(new CheckPulumiPluginTask(), 'installed'),
			wrapTaskForListr({
				name: 'Install Azure Plugin',
				factory: () => new InstallPulumiPluginTask(),
				skip: (ctx) => ctx.installed,
			}),
		]).run();

		cli.info("Good to go 👍 You're ready to deploy to Azure with Nitric 🎉");
	}
}

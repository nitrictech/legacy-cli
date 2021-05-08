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
import cli from 'cli-ux';
import { Listr } from 'listr2';
import { CheckPlugins, InstallGCPPulumiPlugin } from '../../tasks/doctor';

/**
 * Nitric CLI GCP Doctor command
 * Will check and install pre-requisite software for deploying Nitric applications to GCP
 */
export default class Doctor extends BaseCommand {
	static description = 'Checks environment for configuration for deployment to GCP';

	static examples = [`$ nitric doctor:gcp`];

	static flags = {
		...BaseCommand.flags
	};

	static args = [];

	async do(): Promise<void> {
		await new Listr<any>([
			wrapTaskForListr(new CheckPlugins(), 'installed'),
			wrapTaskForListr({
				name: 'Install GCP Plugin',
				factory: () => new InstallGCPPulumiPlugin(),
				skip: (ctx) => ctx.installed,
			}),
		]).run();

		cli.info("Good to go 👍 You're ready to deploy to GCP with Nitric 🎉");
	}
}

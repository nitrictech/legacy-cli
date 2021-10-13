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

import { Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import Deployment from '../../types/deployment';

/**
 * Options when tearing down a stack previously deployed to GCP
 */
interface DownOptions {
	stackName: string;
	destroy: boolean;
}

interface Target {
	type: string; //e.g. bucket
	pulumiTypes: string[];
}

//Map of the protected destroy targets
const protectedTargets: Target[] = [
	{
		type: 'base',
		pulumiTypes: ['pulumi:pulumi:Stack', 'pulumi:providers:gcp'],
	},
	{
		type: 'bucket',
		pulumiTypes: ['gcp:projects/service:Service', 'gcp:storage/bucket:Bucket'],
	},
	{
		type: 'service_accounts',
		pulumiTypes: ['gcp:projects/iAMMember:IAMMember', 'nitric:project:GcpProject', 'nitric:bucket:CloudStorage'],
	},
];

/**
 * Tear down a deployed stack from GCP
 */
export class Down extends Task<void> {
	private stackName: string;
	private destroy: boolean;

	constructor({ stackName, destroy }: DownOptions) {
		super(`Tearing Down Stack: ${stackName}`);
		this.stackName = stackName;
		this.destroy = destroy;
	}

	async do(): Promise<void> {
		const { stackName } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stackName,
				stackName: `${stackName}-gcp`,
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					/*no op*/
				},
			});
			let res;
			if (this.destroy) {
				res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			} else {
				const deployment = (await pulumiStack.exportStack()).deployment as Deployment;
				const nonTargets = protectedTargets //Possible to filter the protected targets in the future
					.map((val) => val.pulumiTypes)
					.reduce((acc, val) => acc.concat(val), []);
				//List of targets that will be destroyed, filters out the ones that are protected
				const targets = deployment.resources
					.filter((resource) => !nonTargets.includes(resource.type))
					.map((resource) => resource.urn);
				if (targets.length > 0) {
					res = await pulumiStack.destroy({ onOutput: this.update.bind(this), target: targets });
				}
			}
			console.log(res);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

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

import { NitricStack, Task } from '@nitric/cli-common';
import { LocalWorkspace } from '@pulumi/pulumi/automation';
import Deployment from '../../types/deployment';

/**
 * Options when tearing down a nitric stack from AWS
 */
interface DownOptions {
	stack: NitricStack;
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
		pulumiTypes: ['pulumi:pulumi:Stack', 'pulumi:providers:aws'],
	},
	{
		type: 'bucket',
		pulumiTypes: ['nitric:bucket:S3', 'aws:s3/bucket:Bucket'],
	},
];

const NO_OP = async (): Promise<void> => {
	return;
};

/**
 * Tear down a previously deployed nitric stack from AWS.
 */
export class Down extends Task<void> {
	private stack: NitricStack;
	private destroy: boolean;

	constructor({ stack, destroy }: DownOptions) {
		super(`Tearing Down Stack: ${stack.name}`);
		this.stack = stack;
		this.destroy = destroy;
	}

	async do(): Promise<void> {
		const { stack } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stack.name,
				stackName: `${stack.name}-aws`,
				// generate our pulumi program on the fly from the POST body
				program: NO_OP,
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
			if (res.summary && res.summary.resourceChanges) {
				const changes = Object.entries(res.summary.resourceChanges)
					.map((entry) => entry.join(': '))
					.join(', ');
				this.update(changes);
			}
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

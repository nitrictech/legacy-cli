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
import { mapObject, NitricStack } from '@nitric/cli-common';
import { cli } from 'cli-ux';

/**
 * Options when tearing down a stack previously deployed to GCP
 */
interface DownOptions {
	stack: NitricStack;
	destroy: boolean;
}

function getURN(stackName: string, type: string, resourceName): string {
	return `urn:pulumi:${stackName}::${stackName}-aws::nitric:${type}::${resourceName}`;
}

//urn:pulumi:stackName:::Resource$aws:s3/bucket:Bucket::my-bucket
function getTargets(stack: NitricStack, ignore: string[]): string[] {
	const relationship = {
		buckets: 'CloudStorage',
		collections: 'FireStore',
		entrypoints: 'GoogleCloudLB',
		apis: 'GcpApiGateway',
		schedules: 'CloudScheduler',
		services: 'CloudRun',
		sites: 'CloudStorage',
		topics: 'PubSub',
	};
	const getUrn = getURN.bind(null, stack.name);
	const targets: string[] = Object.entries(stack)
		.filter((stackEntry) => ignore.includes(stackEntry[0]))
		.map((stackEntry) =>
			mapObject(stackEntry[1]).map((entry) => getUrn(entry.name, `${stackEntry[0]}:${relationship[stackEntry[0]]}`)),
		)
		.reduce((acc, val) => acc.concat(val), []);
	return targets;
}

/**
 * Tear down a deployed stack from GCP
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
		const { stack, destroy } = this;

		let confirm = 'y';
		if (destroy) {
			confirm = await cli.prompt('All collections, buckets and secrets will be destroyed. Are you sure? (Y/N)');
		}

		if (confirm.toLowerCase() == 'y') {
			try {
				const pulumiStack = await LocalWorkspace.selectStack({
					projectName: stack.name,
					stackName: `${stack.name}-gcp`,
					// generate our pulumi program on the fly from the POST body
					program: async () => {
						/*no op*/
					},
				});

				// await pulumiStack.setConfig("gcp:region", { value: region });
				const res = destroy
					? await pulumiStack.destroy({ onOutput: this.update.bind(this) })
					: await pulumiStack.destroy({
							onOutput: this.update.bind(this),
							target: getTargets(stack, ['secrets', 'buckets', 'collections']),
					  });
				console.log(res);
			} catch (e) {
				console.log(e);
				throw e;
			}
		}
	}
}

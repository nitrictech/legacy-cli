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

interface DownOptions {
	stackName: string;
}

/**
 * Tear down a deployed stack
 */
export class Down extends Task<void> {
	private stackName: string;

	constructor({ stackName }: DownOptions) {
		super(`Tearing Down Stack: ${stackName}`);
		this.stackName = stackName;
	}

	async do(): Promise<void> {
		const { stackName } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stackName,
				stackName: 'gcp',
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					/*no op*/
				},
			});

			// await pulumiStack.setConfig("gcp:region", { value: region });
			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			console.log(res);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

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

interface DownOptions {
	stack: NitricStack;
}

const NO_OP = async (): Promise<void> => {
	return;
};

export class Down extends Task<void> {
	private stack: NitricStack;

	constructor({ stack }: DownOptions) {
		super(`Tearing Down Stack: ${stack.name}`);
		this.stack = stack;
	}

	async do(): Promise<void> {
		const { stack } = this;

		try {
			const pulumiStack = await LocalWorkspace.selectStack({
				projectName: stack.name,
				stackName: 'azure',
				// generate our pulumi program on the fly from the POST body
				program: NO_OP,
			});

			const res = await pulumiStack.destroy({ onOutput: this.update.bind(this) });
			console.log(res);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
}

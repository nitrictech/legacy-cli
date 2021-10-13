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
import { BaseCommand, wrapTaskForListr, Stack } from '@nitric/cli-common';
import { Listr } from 'listr2';
import path from 'path';
import { Down } from '../../tasks/down';
import { constants } from '@nitric/cli-common';

export default class DownCmd extends BaseCommand {
	static description = 'tear down a stack previously deployed to Azure using `$ nitric deploy:azure`';

	static examples = [`$ nitric down:azure`];

	static flags = {
		...BaseCommand.flags,
		file: flags.string({ char: 'f' }),
		destroy: flags.boolean({
			char: 'd',
			description: 'destroy all resources, including buckets, secrets, and collections',
		}),
	};

	static args = [{ name: 'dir' }];

	async do(): Promise<any> {
		const { args, flags } = this.parse(DownCmd);
		const { dir = '.' } = args;
		const { file = 'nitric.yaml', destroy } = flags;

		const stackDefinitionPath = path.join(dir, file);
		const stack = (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		try {
			await new Listr([wrapTaskForListr(new Down({ stack, destroy }))], constants.DEFAULT_LISTR_OPTIONS).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

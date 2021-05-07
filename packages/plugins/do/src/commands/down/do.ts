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

export default class DownCmd extends BaseCommand {
	static description = 'Delete a Stack on Digital Ocean deployed by $ nitric deploy:do';

	static examples = [`$ nitric down:do`];

	static flags = {
		file: flags.string({ char: 'f' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async do(): Promise<any> {
		const { args, flags } = this.parse(DownCmd);
		const { dir = '.' } = args;
		const { file = 'nitric.yaml' } = flags;

		const stackDefinitionPath = path.join(dir, file);
		const stack = (await Stack.fromFile(stackDefinitionPath)).asNitricStack();

		try {
			await new Listr([wrapTaskForListr(new Down({ stack }))]).run();
		} catch (error) {
			// eat this error to avoid duplicate console output.
		}
	}
}

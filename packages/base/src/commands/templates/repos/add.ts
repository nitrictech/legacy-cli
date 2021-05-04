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

import { wrapTaskForListr } from '@nitric/cli-common';
import { Command, flags } from '@oclif/command';
import { Listr } from 'listr2';
import { AddRepositoryTask } from '../../../tasks/repository/add';
import { UpdateStoreTask } from '../../../tasks/store/update';

export default class AddRepository extends Command {
	static description = 'Adds a new repository for nitric templates';

	static examples = ['$ nitric templates:repos:add'];

	static flags = {
		help: flags.help({ char: 'h' }),
		url: flags.string({
			char: 'u',
			description: 'URL of the git repository to retrieve template repository from',
		}),
	};

	static args = [
		{
			name: 'alias',
			required: false,
			description:
				'alias of the template repository to retrieve, will look in official nitric repo store first if url is given this will be the name downloaded repository',
		},
	];

	async run(): Promise<void> {
		const { args, flags } = this.parse(AddRepository);
		// Pull the official repository by default
		const { alias = 'official' } = args;
		const { url } = flags;

		await new Listr([
			wrapTaskForListr(new UpdateStoreTask()),
			wrapTaskForListr(new AddRepositoryTask({ alias, url })),
		]).run();
	}
}

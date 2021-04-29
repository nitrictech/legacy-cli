// Copyright 2021, Nitric Pty Ltd.
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

import { Command, flags } from '@oclif/command';
import { ListTemplatesTask } from '../../tasks/template/list';
import { cli } from 'cli-ux';

export default class ListTemplates extends Command {
	static description = 'Lists locally available nitric templates';

	static examples = ['$ nitric templates:list'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		const templates = await new ListTemplatesTask().do();

		if (Object.keys(templates).length == 0) {
			// No templates found
			cli.log('No templates found, try installing some repositories using nitric templates:repos add');
		}

		const root = cli.tree();

		Object.keys(templates).forEach((key) => {
			const repoTree = cli.tree();
			templates[key].forEach((template) => repoTree.insert(template));

			root.insert(key, repoTree);
		});

		root.display();
	}
}

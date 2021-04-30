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

import { Task, Repository } from '@nitric/cli-common';

interface ListTemplatesResult {
	[repositoryName: string]: string[];
}

/**
 * List locally available templates and the repositories they belong to
 */
export class ListTemplatesTask extends Task<ListTemplatesResult> {
	constructor() {
		super('List Templates');
	}

	async do(): Promise<ListTemplatesResult> {
		const repositories = await Repository.fromDefaultDirectory();

		return repositories.reduce((acc, repo) => {
			const templates = repo.getTemplates();

			return {
				...acc,
				[repo.getName()]: templates.map((t) => t.getName()),
			};
		}, {});
	}
}

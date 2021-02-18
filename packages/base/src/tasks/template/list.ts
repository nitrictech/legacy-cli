import { Task } from '@nitric/cli-common';
import { Repository } from '../../templates';

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

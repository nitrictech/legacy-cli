import { Task } from '@nitric/cli-common';
import fs from 'fs';
import { TEMPLATE_DIR } from '../../common/paths';
import { getAvailableRepositories, loadRepositoryManifest } from '../../utils';

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
		// First find the nitric home directory
		try {
			const repoDirectories = getAvailableRepositories().map((repoTuple) => repoTuple[0]);

			return repoDirectories.reduce((acc, repo) => {
				try {
					const repoManifest = loadRepositoryManifest(repo);
					return {
						...acc,
						[repo]: repoManifest.templates.map((template) => template.name),
					};
				} catch (error) {
					return acc;
				}
			}, {} as ListTemplatesResult);
		} catch (error) {
			throw new Error(`Could not find templates directory: ${error.message}`);
		}
	}
}

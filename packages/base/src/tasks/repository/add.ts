import { Task } from '@nitric/cli-common';
import path from 'path';
import fs from 'fs';
import { TEMPLATE_DIR } from '../../common/paths';
import { loadRepositoriesManifest } from '../../utils';
import { gitP } from 'simple-git';
import rimraf from 'rimraf';

interface AddRepositoryTaskOptions {
	url?: string;
	alias: string;
}

/**
 * List locally available templates and the repositories they belong to
 */
export class AddRepositoryTask extends Task<void> {
	private url: string | undefined;
	private alias: string;

	constructor({ alias, url }: AddRepositoryTaskOptions) {
		super('Add Repository');
		this.alias = alias;
		this.url = url;
	}

	async do(): Promise<void> {
		const { url, alias } = this;
		const repositoryPath = path.join(TEMPLATE_DIR, `./${alias}`);
		const repositories = loadRepositoriesManifest();

		// Using one of the official reserved names
		if (url && repositories[alias]) {
			throw new Error('Alias exists as a reserved name in the nitric store, please use a different name');
		}

		// Do a fresh checkout every time
		if (fs.existsSync(repositoryPath)) {
			rimraf.sync(repositoryPath);
		}

		await fs.promises.mkdir(repositoryPath, { recursive: true });

		const git = gitP(repositoryPath);

		if (!url) {
			const repository = repositories[alias];

			if (!repository) {
				throw new Error(`No registered repository exists with name: ${alias}`);
			}
			// we're looking for a template-store repository here
			// we'll assume it already exists (we're running the store update in the cli command)
			await git.clone(repository.location, '.', {
				'--depth': 1,
			});
			// make sure we're up to date on the latest template store...
		} else {
			// Assume its a git repository for now
			await git.clone(url, '.', {
				'--depth': 1,
			});
		}
		// Once it's checkout out we should verify that it is actually in fact a nitric repository
	}
}

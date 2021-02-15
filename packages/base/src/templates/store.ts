import { Repository } from './repository';
import { NITRIC_REPOSITORIES_FILE, NITRIC_STORE_DIR } from '../common/paths';
import { gitP } from 'simple-git';
import rimraf from 'rimraf';
import fs from 'fs';
import YAML from 'yaml';

const NITRIC_TEMPLATE_STORE = 'https://github.com/nitrictech/template-store';

interface RepositoryDescriptor {
	location: string;
}

/**
 * Manages a Nitric Template Store
 */
export class Store {
	private repositories: Record<string, RepositoryDescriptor>;

	constructor(repositories: Record<string, RepositoryDescriptor>) {
		this.repositories = repositories;
	}

	/**
	 * Checks out nitric repository from the given location
	 * @param name
	 */
	async checkoutRepository(key: string): Promise<Repository> {
		const repo = this.repositories[key];

		if (!repo) {
			throw new Error(`Repository ${key} not found in store`);
		}

		return await Repository.checkout(key, repo.location);
	}

	/**
	 * Load a store manifest from a given file
	 * @param file
	 */
	static fromFile(file: string): Store {
		const repos = YAML.parse(fs.readFileSync(file).toString()) as Record<string, RepositoryDescriptor>;
		return new Store(repos);
	}

	/**
	 * Load store from template directory
	 */
	static fromDefault(): Store {
		return Store.fromFile(NITRIC_REPOSITORIES_FILE);
	}

	/**
	 * Checkout store from the given URL
	 * @param url
	 */
	static async checkout(url: string): Promise<Store> {
		// Checkout the store using gitP
		if (fs.existsSync(NITRIC_STORE_DIR)) {
			await new Promise<void>((res, rej) => {
				rimraf(NITRIC_STORE_DIR, (error) => {
					if (error) {
						rej(error);
					} else {
						res();
					}
				});
			});
		}

		await fs.promises.mkdir(NITRIC_STORE_DIR, { recursive: true });

		const git = gitP(NITRIC_STORE_DIR);

		await git.clone(url, '.', {
			'--depth': 1,
		});

		return Store.fromDefault();
	}

	/**
	 * Checkout store from the default (official) URL
	 */
	static async checkoutDefault(): Promise<Store> {
		return Store.checkout(NITRIC_TEMPLATE_STORE);
	}
}

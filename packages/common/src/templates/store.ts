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

import { Repository } from './repository';
import { NITRIC_REPOSITORIES_FILE, NITRIC_STORE_DIR } from '../paths';
import { gitP } from 'simple-git';
import rimraf from 'rimraf';
import fs from 'fs';
import YAML from 'yaml';
import which from 'which';

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

	availableRepositories(): string[] {
		return Object.keys(this.repositories);
	}

	hasRepostory(name: string): boolean {
		return !!this.repositories[name];
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

		if (!which.sync('git', { nothrow: true })) {
			throw new Error(
				"Git not found! Nitric CLI relies on Git to retrieve the template store. Ensure it's installed and available on path.",
			);
		}

		try {
			const git = gitP(NITRIC_STORE_DIR);
			await git.clone(url, '.', {
				'--depth': 1,
			});
		} catch (error) {
			throw new Error(`Failed retrieve template store ${url}.\nDetails: ${error}`);
		}

		return Store.fromDefault();
	}

	/**
	 * Checkout store from the default (official) URL
	 */
	static async checkoutDefault(): Promise<Store> {
		return Store.checkout(NITRIC_TEMPLATE_STORE);
	}
}

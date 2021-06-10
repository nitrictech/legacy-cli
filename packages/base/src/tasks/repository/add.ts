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

import { Task, Repository, Store } from '@nitric/cli-common';

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
		super(`Add Repository: ${alias}`);
		this.alias = alias;
		this.url = url;
	}

	async do(): Promise<void> {
		const { url, alias } = this;
		// Load the default store
		const store = Store.fromDefault();

		// Using one of the official reserved names
		if (url && store.hasRepostory(alias)) {
			throw new Error('Alias exists as a reserved name in the nitric store, please use a different name');
		}

		if (url) {
			// Checkout the repository directly from url
			await Repository.checkout(alias, url);
		} else {
			// checkout the repository via the nitric store
			await store.checkoutRepository(alias);
		}
	}
}

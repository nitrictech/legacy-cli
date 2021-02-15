import { Task } from '@nitric/cli-common';
import { Repository, Store } from '../../templates';

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
		// Load the default store
		const store = Store.fromDefault()

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

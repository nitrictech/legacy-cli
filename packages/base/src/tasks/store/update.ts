import { Task } from '@nitric/cli-common';
import { Store } from '../../templates';

/**
 * Pulls the latest official nitric store manifests
 */
export class UpdateStoreTask extends Task<void> {
	constructor() {
		super('Updating Nitric Store');
	}

	async do(): Promise<void> {
		await Store.checkoutDefault();
	}
}

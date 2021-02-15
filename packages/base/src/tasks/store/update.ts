import { Task } from '@nitric/cli-common';
import fs from 'fs';
import { NITRIC_STORE_DIR } from '../../common/paths';

import { gitP } from 'simple-git';
import rimraf from 'rimraf';

// The nitric template store location
const NITRIC_TEMPLATE_STORE = 'https://github.com/nitrictech/template-store';

/**
 * Pulls the latest official nitric store manifests
 */
export class UpdateStoreTask extends Task<void> {
	constructor() {
		super('Updating Nitric Store');
	}

	async do(): Promise<void> {
		// Do a fresh checkout every time
		if (fs.existsSync(NITRIC_STORE_DIR)) {
			await new Promise((res, rej) => {
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

		await git.clone(NITRIC_TEMPLATE_STORE, '.', {
			'--depth': 1,
		});
	}
}

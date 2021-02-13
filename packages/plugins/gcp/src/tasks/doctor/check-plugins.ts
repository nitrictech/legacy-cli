import { Task } from '@nitric/cli-common';
import execa from 'execa';

export class CheckPlugins extends Task<boolean> {
	constructor() {
		super('Checking for Pulumi GCP Plugin');
	}

	async do() {
		try {
			const result = execa.commandSync('pulumi plugin ls');

			if (result.stdout.includes('gcp')) {
				return true;
			}
		} catch (e) {
			throw new Error('Pulumi is not installed, please run nitric doctor to install pre-requisite software');
		}

		return false;
	}
}

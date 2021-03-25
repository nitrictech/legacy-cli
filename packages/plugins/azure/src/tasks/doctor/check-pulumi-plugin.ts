import { Task } from '@nitric/cli-common';
import execa from 'execa';

export class CheckPulumiPluginTask extends Task<boolean> {
	constructor() {
		super('Checking azure pulumi plugin installation');
	}

	async do(): Promise<boolean> {
		// Perform the check
		try {
			const result = execa.commandSync('pulumi plugin ls');

			if (result.stdout.includes('azure')) {
				return true;
			}
		} catch (e) {
			throw new Error('Pulumi is not installed, please run nitric doctor to install pre-requisite software');
		}

		return false;
	}
}

import { Task } from '@nitric/cli-common';
import execa from 'execa';

export class CheckPulumiPlugins extends Task<boolean> {
	constructor() {
		super('Checking For Pulumi AWS Plugin');
	}

	async do() {
		try {
			const result = execa.commandSync('pulumi plugin ls');

			if (result.stdout.includes('aws')) {
				return true;
			}
		} catch (e) {
			throw new Error('Pulumi is no installed, please run nitric doctor to install pre-requisite software');
		}

		return false;
	}
}

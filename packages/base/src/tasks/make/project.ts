import { Task } from '@nitric/cli-common';
import fs from 'fs';
import YAML from 'yaml';

export class MakeProject extends Task<void> {
	private projectName: string;
	private force: boolean;

	constructor(name: string, force: boolean) {
		super(`Making Project ${name}`);
		this.projectName = name;
		this.force = force;
	}

	async do(): Promise<void> {
		const { projectName } = this;

		// 1: Create new folder relative to current directory for the new project
		try {
			fs.mkdirSync(`./${projectName}`);
		} catch (error) {
			if (error.message.includes('file already exists')) {
				if (!this.force) {
					throw new Error('Directory already exists re-run with --force to confirm creation');
				}
			} else {
				throw error;
			}
		}

		// 2: Create a nitric.yaml file within the new project with the stack name initiated as the current project name
		fs.writeFileSync(
			`./${projectName}/nitric.yaml`,
			Buffer.from(
				YAML.stringify({
					name: projectName,
				}),
				'utf-8',
			),
		);
	}
}

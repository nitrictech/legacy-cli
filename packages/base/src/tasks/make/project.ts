import { Task } from '@nitric/common';
import fs from 'fs';
import YAML from 'yaml';

export class MakeProject extends Task<void> {
	private projectName: string;

	constructor(name: string) {
		super(`Making Project ${name}`);
		this.projectName = name;
	}

	async do() {
		const { projectName } = this;

		// 1: Create new folder relative to current directory for the new project
		fs.mkdirSync(`./${projectName}`);

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

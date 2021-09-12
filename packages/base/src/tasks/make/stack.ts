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

import { Repository, Stack, Task, Template } from '@nitric/cli-common';
import fs from 'fs';
import YAML from 'yaml';
import path from 'path';
import cli from 'cli-ux';

const SAFE_NAME_PATTERN = /^(?!-)([a-zA-Z0-9-](?!-($|-)))*$/;

interface TemplateDescriptor {
	name: string;
	repository: string;
}

interface MakeStackTaskOpts {
	name: string;
	template?: TemplateDescriptor;
	force?: boolean;
}

export class MakeStackTask extends Task<void> {
	private stackName: string;
	private template?: TemplateDescriptor;
	private force: boolean;

	constructor({ name, template, force = false }: MakeStackTaskOpts) {
		super(`Making New Stack ${name}`);
		this.stackName = name;
		this.template = template;
		this.force = force;
	}

	async do(): Promise<void> {
		const { stackName } = this;

		// Validate the stack name, to ensure it's safe as a directory name and for various naming conventions on the cloud.
		if (!SAFE_NAME_PATTERN.test(stackName)) {
			throw new Error('Invalid stack name, only letters, numbers and dashes are supported.');
		}

		const stackPath = `./${stackName}`;

		// Create new folder relative to current directory for the new project
		try {
			fs.mkdirSync(stackPath, { recursive: true });
		} catch (error) {
			if (error.message.includes('file already exists')) {
				if (!this.force) {
					throw new Error('Directory already exists re-run with --force to create, disregarding existing contents');
				}
			} else {
				throw error;
			}
		}

		if (this.template) {
			const repoName = this.template.repository || 'official';
			const repo = Repository.fromDefaultDirectory().find((repo) => repo.getName() === repoName);
			if (!repo) {
				throw new Error(`Repository ${repoName} is not available`);
			}

			const template = repo.getTemplate(this.template.name);
			await Template.copyTo(template, stackPath);

			// Update stack name
			try {
				const stackFilePath = path.join(stackPath, './nitric.yaml');
				const stack = await Stack.fromFile(stackFilePath);
				stack.setName(stackName);
				await Stack.writeTo(stack, stackFilePath);
			} catch (nameUpdateError) {
				cli.log(`stack created but failed to update stack name in nitric.yaml. Details: ${nameUpdateError.error}`);
			}
		} else {
			// If no template is wanted, just create an empty stack file ready for manual editing
			fs.writeFileSync(
				path.join(stackPath, './nitric.yaml'),
				Buffer.from(
					YAML.stringify({
						name: stackName,
					}),
					'utf-8',
				),
			);
		}
	}
}

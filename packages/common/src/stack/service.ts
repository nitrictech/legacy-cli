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

import { NitricService } from '../types';
import { Stack } from './stack';
import path from 'path';
import { Repository, Template } from '../templates';
import fs from 'fs';
import tar from 'tar-fs';
import streamToPromise from 'stream-to-promise';
import match from 'multimatch';

type omitMethods = 'getService' | 'getServices';

export class Service {
	// Back reference to the parent stack
	// emit getFunction here to prevent recursion
	private stack: Omit<Stack, omitMethods>;
	private name: string;
	private descriptor: NitricService;

	constructor(stack: Stack, name: string, descriptor: NitricService) {
		this.stack = stack;
		this.name = name;
		this.descriptor = descriptor;
	}

	// Returns reference to parent stack sans ability to get methods
	getStack(): Omit<Stack, omitMethods> {
		return this.stack;
	}

	asNitricService(): NitricService {
		return this.descriptor;
	}

	getName(): string {
		return this.name;
	}

	getDirectory(): string {
		const funcPath = path.join(this.stack.getDirectory(), this.descriptor.path);
		if (!fs.existsSync(funcPath)) {
			throw new Error(
				`function directory '${this.descriptor.path}' for function '${this.name}' not found. Directory may have been renamed or removed, check 'path' configuration for this function in the config file.`,
			);
		}
		return funcPath;
	}

	getStagingDirectory(): string {
		return path.join(this.stack.getStagingDirectory(), this.name);
	}

	getImageTagName(provider?: string): string {
		const providerString =	provider 
			? `-${provider}`
			: "";
		return `${this.stack.getName()}-${this.name}${providerString}`;
	}

	// Find the template for a function from a given set of repositories
	static async findTemplateForService(s: Service, repos: Repository[]): Promise<Template> {
		const [repoName, tmplName] = s.descriptor.runtime.split('/');

		const repo = repos.find((r) => r.getName() === repoName);
		if (!repo) {
			throw new Error(`Repository ${repoName} could not be found`);
		}

		if (!repo.hasTemplate(tmplName)) {
			throw new Error(`Repository ${repoName} does not contain template ${tmplName}`);
		}

		return repo.getTemplate(tmplName);
	}

	// Stage the files for a function ready to build
	static async stage(s: Service, repos: Repository[]): Promise<void> {
		const serviceStaging = s.getStagingDirectory();
		const template = await Service.findTemplateForService(s, repos);

		const dockerIgnoreFiles = await Template.getDockerIgnoreFiles(template);

		// TODO: Do we need to do this?
		await fs.promises.mkdir(serviceStaging, { recursive: true });

		await Template.copyRuntimeTo(template, serviceStaging);

		// TODO: Should we rm or exclude the code directory of the Template, to ensure
		// extra files don't make it through?
		const functionPipe = tar.extract(`${serviceStaging}/function`);
		// Now we need to copy the actual function code, the the above directory/function directory
		const functionDirectory = s.getDirectory();

		tar
			.pack(functionDirectory, {
				ignore: (name) =>
					// Simple filter before more complex multimatch
					// dockerIgnoreFiles.filter(f => name.includes(f)).length > 0 ||
					match(name, dockerIgnoreFiles).length > 0,
			})
			.pipe(functionPipe);

		await streamToPromise(functionPipe);
	}
}

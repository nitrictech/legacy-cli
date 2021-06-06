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

type omitMethods = 'getService' | 'getServices';

/**
 * Represents a Nitric Service (Function/Container/etc.)
 */
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

	/**
	 * Returns reference to parent stack sans ability to get methods
	 */
	getStack(): Omit<Stack, omitMethods> {
		return this.stack;
	}

	/**
	 * Returns the descriptor for this service
	 */
	asNitricService(): NitricService {
		return this.descriptor;
	}

	/**
	 * Return the service name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Return the directory that contains this service's source
	 */
	getDirectory(): string {
		const funcPath = path.join(this.stack.getDirectory(), this.descriptor.path);
		if (!fs.existsSync(funcPath)) {
			throw new Error(
				`function directory '${this.descriptor.path}' for function '${this.name}' not found. Directory may have been renamed or removed, check 'path' configuration for this function in the config file.`,
			);
		}
		return funcPath;
	}

	/**
	 * Get the directory used to stage a container image build of this service
	 */
	getStagingDirectory(): string {
		return path.join(this.stack.getStagingDirectory(), this.name);
	}

	/**
	 * Return the default image tag for a container image built from this service
	 * @param provider the provider name (e.g. aws), used to uniquely identify builds for specific providers
	 */
	getImageTagName(provider?: string): string {
		const providerString = provider ? `-${provider}` : '';
		return `${this.stack.getName()}-${this.name}${providerString}`;
	}

	/**
	 * Find the template for a function from a given set of repositories
	 * @param s the service to find the template for
	 * @param repos the repositories to search in for the template
	 */
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
}

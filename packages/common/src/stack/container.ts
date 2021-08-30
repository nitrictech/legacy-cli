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

import { NitricContainer } from '../types';
import { Stack } from './stack';
import path from 'path';
import fs from 'fs';

type omitMethods = 'getService' | 'getServices';

/**
 * Represents a Nitric Container
 */
export class StackContainer<ContainerExtensions = Record<string, any>> {
	// Back reference to the parent stack
	// emit getContainer here to prevent recursion
	private stack: Omit<Stack, omitMethods>;
	private name: string;
	private descriptor: NitricContainer<ContainerExtensions>;

	constructor(stack: Stack, name: string, descriptor: NitricContainer<ContainerExtensions>) {
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
	 * Returns the descriptor for this source
	 */
	getDescriptor(): NitricContainer<ContainerExtensions> {
		return this.descriptor;
	}

	/**
	 * Return the source name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Get the build context of the source
	 * @returns
	 */
	getContext(): string {
		const origCtx = this.descriptor.context;
		const ctxPath = origCtx ? path.join(this.stack.getDirectory(), origCtx) : this.stack.getDirectory();

		if (!fs.existsSync(ctxPath)) {
			throw new Error(
				`container build context '${origCtx}' for container '${this.name}' not found. Directory may have been renamed or removed, check 'context' configuration for this container in the config file.`,
			);
		}

		return ctxPath;
	}

	/**
	 * Get the path to Dockerfile used to build this source.
	 *
	 * The returned path is relative and below the context directory.
	 * @returns
	 */
	getDockerfile(): string {
		const origPath = this.descriptor.dockerfile;
		const fullPath = path.join(this.getContext(), origPath);

		if (!fs.existsSync(fullPath)) {
			throw new Error(
				`Dockerfile '${origPath}' for container '${this.name}' not found in context directory '${this.descriptor.context}'. Check that the file exists and the path is correct relative to the context directory.`,
			);
		}

		return origPath;
	}

	/**
	 * Return the default image tag for a source image built from this source definition
	 * @param provider the provider name (e.g. aws), used to uniquely identify builds for specific providers
	 */
	getImageTagName(provider?: string): string {
		const providerString = provider ? `-${provider}` : '';
		return `${this.stack.getName()}-${this.name}${providerString}`;
	}
}

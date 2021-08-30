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

import { NitricFunction } from '../types';
import { Stack } from './stack';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import Handlebars from 'handlebars';

type omitMethods = 'getService' | 'getServices';

/**
 * Represents a Nitric Function
 */
export class Func<FuncExtensions = Record<string, any>> {
	// Back reference to the parent stack
	// emit getFunction here to prevent recursion
	private stack: Omit<Stack, omitMethods>;
	private name: string;
	private descriptor: NitricFunction<FuncExtensions>;

	constructor(stack: Stack, name: string, descriptor: NitricFunction<FuncExtensions>) {
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
	 * Returns the descriptor for this function
	 */
	asNitricFunction(): NitricFunction<FuncExtensions> {
		return this.descriptor;
	}

	/**
	 * Return the function name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Get the build context of the function
	 * @returns
	 */
	getContext(): string {
		const origCtx = this.descriptor.context || this.descriptor.path;
		const ctxPath = path.join(this.stack.getDirectory(), origCtx);

		if (!fs.existsSync(ctxPath)) {
			throw new Error(
				`function context '${origCtx}' for function '${this.name}' not found. Directory may have been renamed or removed, check 'context' and 'path' configuration for this function in the config file.`,
			);
		}

		return ctxPath;
	}

	/**
	 * Returns defined path relative to context
	 * @returns
	 */
	getContextRelativeDirectory(): string {
		return this.descriptor.context ? this.descriptor.path : '.';
	}

	/**
	 * Return the directory that contains this function's source
	 */
	getDirectory(): string {
		const funcPath = path.join(this.getContext(), this.getContextRelativeDirectory());

		if (!fs.existsSync(funcPath)) {
			throw new Error(
				`function directory '${this.descriptor.path}' for function '${this.name}' not found. Directory may have been renamed or removed, check 'path' configuration for this function in the config file.`,
			);
		}
		return funcPath;
	}

	/**
	 * Get the pack env config for a given function
	 * @returns
	 */
	getPackEnv(): dotenv.DotenvParseOutput {
		const packrcFile = path.join(this.getDirectory(), '.packrc');
		if (fs.existsSync(packrcFile)) {
			const packContents = fs.readFileSync(packrcFile).toString();
			const template = Handlebars.compile(packContents);

			const parsedRc = template({
				PATH: this.getContextRelativeDirectory(),
			});

			return dotenv.parse(parsedRc);
		}
		// return empty env variables
		return {};
	}

	/**
	 * Get the directory used to stage a container image build of this function
	 */
	getStagingDirectory(): string {
		return path.join(this.stack.getStagingDirectory(), this.name);
	}

	/**
	 * Return the default image tag for a container image built from this function
	 * @param provider the provider name (e.g. aws), used to uniquely identify builds for specific providers
	 */
	getImageTagName(provider?: string): string {
		const providerString = provider ? `-${provider}` : '';
		return `${this.stack.getName()}-${this.name}${providerString}`;
	}
}

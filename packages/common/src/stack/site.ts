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

import { NitricStaticSite } from '../types';
import { Stack } from './stack';
import execa from 'execa';
import path from 'path';

/**
 * A Nitric Static Site
 */
export class Site {
	private name: string;
	private stack: Stack;
	private descriptor: NitricStaticSite;

	constructor(stack: Stack, name: string, descriptor: NitricStaticSite) {
		this.stack = stack;
		this.name = name;
		this.descriptor = descriptor;
	}

	/**
	 * Return the path to the directory containing this site within the stack directory
	 */
	getPath(): string {
		return path.join(this.stack.getDirectory(), this.descriptor.path);
	}

	/**
	 * Return the name of this site
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Return the descriptor for this site
	 */
	getDescriptor(): NitricStaticSite {
		return this.descriptor;
	}

	/**
	 * Return the asset path of the static site
	 */
	getAssetPath(): string {
		const baseAssetPath = this.descriptor.assetPath
			? path.join(this.descriptor.path, this.descriptor.assetPath)
			: this.descriptor.path;

		return path.join(this.stack.getDirectory(), baseAssetPath);
	}

	/**
	 * Build a static site by executing its build scripts
	 * @param site the site to build
	 */
	static async build(site: Site): Promise<void> {
		if (site.descriptor.buildScripts) {
			const workingDir = site.getPath();

			for (const script of site.descriptor.buildScripts) {
				await execa.command(script, { cwd: workingDir });
			}
		}
	}

	static buildSync(site: Site): void {
		if (site.descriptor.buildScripts) {
			const workingDir = site.getPath();

			for (const script of site.descriptor.buildScripts) {
				execa.commandSync(script, { cwd: workingDir });
			}
		}
	}
}

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
	private stack: Stack;
	private descriptor: NitricStaticSite;

	constructor(stack: Stack, descriptor: NitricStaticSite) {
		this.stack = stack;
		this.descriptor = descriptor;
	}

	getPath(): string {
		return path.join(this.stack.getDirectory(), this.descriptor.path);
	}

	getName(): string {
		return this.descriptor.name;
	}

	// Return the original nitric descriptor
	getDescriptor(): NitricStaticSite {
		return this.descriptor;
	}

	// Get the asset path of a static site
	getAssetPath(): string {
		const baseAssetPath = this.descriptor.assetPath
			? path.join(this.descriptor.path, this.descriptor.assetPath)
			: this.descriptor.path;

		return path.join(this.stack.getDirectory(), baseAssetPath);
	}

	static async build(site: Site): Promise<void> {
		// Build the static site given a set of build scripts
		if (site.descriptor.buildScripts) {
			const workingDir = site.getPath();

			for (const script of site.descriptor.buildScripts) {
				await execa.command(script, { cwd: workingDir });
			}
		}
	}
}

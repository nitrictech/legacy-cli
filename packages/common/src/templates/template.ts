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

import path from 'path';
import fs from 'fs';
import tar from 'tar-fs';
import streamToPromise from 'stream-to-promise';

/**
 * The yaml file representation of a Nitric Template
 */
export interface TemplateDescriptor {
	name: string;
	lang: string;
	path: string;
	codeDir?: string;
	devDockerfile?: string;
}

/**
 * Class representation of a nitric template
 */
export class Template {
	private descriptor: TemplateDescriptor;

	constructor(descriptor: TemplateDescriptor) {
		this.descriptor = descriptor;
	}

	get raw(): TemplateDescriptor {
		return this.descriptor;
	}

	get name(): string {
		return this.descriptor.name;
	}

	get lang(): string {
		return this.descriptor.lang;
	}

	get path(): string {
		return this.descriptor.path
	}

	get codePath(): string {
		const cPath = this.descriptor.codeDir || './function';

		return path.join(this.path, cPath);
	}

	get hasDevMode(): boolean {
		return !!this.descriptor.devDockerfile;
	}

	get devDockerfile(): string {
		// Return the production dockerfile as a fallback
		return this.descriptor.devDockerfile || 'Dockerfile';
	}

	/**
	 *
	 * @param template Copies the wrapper code and dockerfile of the given template
	 * @param path
	 */
	static async copyRuntimeTo(template: Template, toDir: string): Promise<void | Buffer> {
		const inPath = template.path;
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outPath = toDir;
		const codePath = template.codePath || './function';
		const outStream = tar.extract(outPath, {
			// Don't incude the code dir
			ignore: (name) => name.includes(path.normalize(codePath)),
		});
		tar.pack(inPath).pipe(outStream);
		return streamToPromise(outStream);
	}

	/**
	 * Get docker ignore entries for the given template
	 * @param template
	 */
	static async getDockerIgnoreFiles(template: Template): Promise<string[]> {
		const dockerIgnoreFile = path.join(template.path, '.dockerignore');

		if (fs.existsSync(dockerIgnoreFile)) {
			// Read the file and return its contents split by new line
			const contents = await fs.promises.readFile(dockerIgnoreFile);
			const contentString = contents.toString('utf-8');
			return contentString.split('\n');
		}

		return [];
	}

	/**
	 *
	 * @param template Copies the code directory of a given template to a given path
	 * @param path
	 */
	static async copyCodeTo(template: Template, path: string): Promise<void | Buffer> {
		const inPath = template.codePath;
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outPath = path;
		if (fs.existsSync(outPath)) {
			// reject here
			throw new Error(`Function directory already exists: ${path}`);
		}

		const outStream = tar.extract(outPath);
		tar.pack(inPath).pipe(outStream);
		return streamToPromise(outStream);
	}
}

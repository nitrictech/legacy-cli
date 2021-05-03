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
 * Class representation of a nitric template
 */
export class Template {
	private name: string;
	private lang: string;
	// Absolute path of this template
	private path: string;
	// path relative to the template directory
	private codePath?: string;

	constructor(name: string, lang: string, path: string, codePath?: string) {
		this.name = name;
		this.lang = lang;
		this.path = path;
		this.codePath = codePath;
	}

	getName(): string {
		return this.name;
	}

	getLang(): string {
		return this.lang;
	}

	getPath(): string {
		return this.path;
	}

	getCodePath(): string {
		const codePath = this.codePath || './function';

		return path.join(this.path, codePath);
	}

	/**
	 *
	 * @param template Copies the wrapper code and dockerfile of the given template
	 * @param path
	 */
	static async copyRuntimeTo(template: Template, toDir: string): Promise<void> {
		const inPath = template.getPath();
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
	static async copyCodeTo(template: Template, path: string): Promise<void> {
		const inPath = template.getCodePath();
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

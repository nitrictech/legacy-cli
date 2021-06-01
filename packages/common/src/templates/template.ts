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
	private repoName: string;
	private name: string;
	private lang: string;
	// Absolute path of this template
	private path: string;

	constructor(repoName: string, name: string, lang: string, path: string) {
		this.repoName = repoName;
		this.name = name;
		this.lang = lang;
		this.path = path;
	}

	getName(): string {
		return this.name;
	}

	getFullName(): string {
		return `${this.repoName}/${this.name}`;
	}

	getLang(): string {
		return this.lang;
	}

	getPath(): string {
		return this.path;
	}

	getTemplatePath(): string {
		const codePath = './template';

		return path.join(this.path, codePath);
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
	 * @param template Copies the wrapper code and dockerfile of the given template
	 * @param path
	 */
	static async copyRuntimeTo(template: Template, toDir: string): Promise<void | Buffer> {
		const inPath = template.getPath();
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outPath = toDir;
		const codePath = './template';
		const outStream = tar.extract(outPath, {
			// Don't incude the code dir
			ignore: (name) => name.includes(path.normalize(codePath)),
		});
		tar.pack(inPath).pipe(outStream);
		return streamToPromise(outStream);
	}

	/**
	 * Copies a template to a given path
	 * This is designed to pull a template into a users code repository for
	 * consistent building of their project (allows versioing of templates with projects).
	 * 
	 * @param template Template to copy
	 * @param path Path to copy template to 
	 */
	static async copyTo(template: Template, path: string): Promise<void | Buffer> {
		const inPath = template.getPath();
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outStream = tar.extract(path);
		tar.pack(inPath).pipe(outStream);
		return await streamToPromise(outStream);
	}

	/**
	 * Copies only the template subdirectory of a given runtime template
	 * 
	 * @param template Copies the template sub-directory of a given template to a given path
	 * @param path
	 */
	static async copyTemplateTo(template: Template, path: string): Promise<void | Buffer> {
		const inPath = template.getTemplatePath();
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

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
import tar from 'tar-fs';
import streamToPromise from 'stream-to-promise';

/**
 * Class representation of a Nitric Stack Template
 */
export class Template {
	private readonly repoName: string;
	private readonly name: string;
	// Absolute path of this template
	private readonly path: string;

	constructor(repoName: string, name: string, path: string) {
		this.repoName = repoName;
		this.name = name;
		this.path = path;
	}

	getName(): string {
		return this.name;
	}

	getFullName(): string {
		return `${this.repoName}/${this.name}`;
	}

	getPath(): string {
		return this.path;
	}

	getTemplatePath(): string {
		const codePath = './template';

		return path.join(this.path, codePath);
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
		//TODO: should probably do something to make sure the file exists
		const inPath = template.getPath();
		// Make a copy of the function template, using the new name in the output directory
		const outStream = tar.extract(path);
		tar.pack(inPath).pipe(outStream);
		return await streamToPromise(outStream);
	}
}

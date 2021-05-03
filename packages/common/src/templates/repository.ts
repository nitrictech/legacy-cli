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

import { Template } from './template';
import { TEMPLATE_DIR } from '../paths';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import rimraf from 'rimraf';
import { gitP } from 'simple-git';

/**
 * Represents a template description inside a repository file
 */
interface TemplateDescriptor {
	name: string;
	lang: string;
	path: string;
	codeDir?: string;
}

/**
 * File representation of repository
 */
interface RepositoryFile {
	name: string;
	templates: TemplateDescriptor[];
}

/**
 * Class for managing nitric repository state
 */
export class Repository {
	// The name of this repository
	private name: string;
	// The absolute path of this repository
	private path: string;
	// Descriptors for the templates located in this repository
	private templateDescriptors: TemplateDescriptor[];

	constructor(name: string, path: string, templates: TemplateDescriptor[]) {
		this.name = name;
		this.path = path;
		this.templateDescriptors = templates;
	}

	getName(): string {
		return this.name;
	}

	/**
	 * Get all available templates in this repository
	 */
	getTemplates(): Template[] {
		return this.templateDescriptors.map(
			(td) => new Template(td.name, td.lang, path.join(this.path, td.path), td.codeDir),
		);
	}

	hasTemplate(templateName: string): boolean {
		const descriptor = this.templateDescriptors.find(({ name }) => name === templateName);

		if (!descriptor) {
			return false;
		}

		return true;
	}

	/**
	 * Get a template from this repository
	 * @param name
	 */
	getTemplate(templateName: string): Template {
		const descriptor = this.templateDescriptors.find(({ name }) => name === templateName);

		if (!descriptor) {
			throw new Error(`Template ${templateName} does not exist in repository ${this.name}`);
		}

		return new Template(descriptor.name, descriptor.lang, path.join(this.path, descriptor.path), descriptor.codeDir);
	}

	/**
	 * Load a repository from a repository file
	 * @param file
	 */
	static fromFile(file: string): Repository {
		const repoFile = YAML.parse(fs.readFileSync(file).toString()) as RepositoryFile;
		// TODO: Add repo file validation
		return new Repository(repoFile.name, path.join(file, '../'), repoFile.templates);
	}

	/**
	 * Loads repositories from a given directory
	 * @param path
	 */
	static fromDirectory(path: string): Repository[] {
		try {
			return fs
				.readdirSync(path, {
					withFileTypes: true,
				})
				.filter((dirent) => dirent.isDirectory() && fs.existsSync(`${TEMPLATE_DIR}/${dirent.name}/repository.yaml`))
				.map((dirent) => Repository.fromFile(`${TEMPLATE_DIR}/${dirent.name}/repository.yaml`));
		} catch (e) {
			// Gracefully fail
			// We will return a suggestion in the front end if no repositories are found
			return [];
		}
	}

	/**
	 * Load repostories from default template directory
	 */
	static fromDefaultDirectory(): Repository[] {
		return Repository.fromDirectory(TEMPLATE_DIR);
	}

	/**
	 * Return flat list of available templates from a list of repositories
	 * @param repos
	 */
	static availableTemplates(repos: Repository[]): string[] {
		return repos.reduce(
			(acc, r) => [...acc, ...r.getTemplates().map((t) => `${r.getName()}/${t.getName()}`)],
			[] as string[],
		);
	}

	/**
	 * Checkout a fresh repository
	 * @param url
	 */
	static async checkout(name: string, url: string): Promise<Repository> {
		const repositoryPath = path.join(TEMPLATE_DIR, `./${name}`);

		// Do a fresh checkout every time
		if (fs.existsSync(repositoryPath)) {
			rimraf.sync(repositoryPath);
		}

		await fs.promises.mkdir(repositoryPath, { recursive: true });

		const git = gitP(repositoryPath);

		await git.clone(url, '.', {
			'--depth': 1,
		});

		return Repository.fromFile(path.join(repositoryPath, './repository.yaml'));
	}
}

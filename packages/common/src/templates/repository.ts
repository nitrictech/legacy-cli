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

import { Template, TemplateDescriptor } from './template';
import { TEMPLATE_DIR } from '../paths';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import rimraf from 'rimraf';
import { gitP } from 'simple-git';

/**
 * File representation of repository
 */
interface RepositoryFile {
	templates: TemplateDescriptor[];
}

/**
 * Class for managing nitric repository state
 */
export class Repository {
	// The name of this repository
	private _name: string;
	// The absolute path of this repository
	private _path: string;
	// Descriptors for the templates located in this repository
	private templateDescriptors: TemplateDescriptor[];

	constructor(name: string, pth: string, templates: TemplateDescriptor[]) {
		this._name = name;
		this._path = pth;
		this.templateDescriptors = templates.map(td => ({
			...td,
			path: path.join(pth, td.path)
		}));
	}

	/**
	 * Return the name of the repository
	 */
	get name(): string {
		return this._name;
	}

	get path(): string {
		return this._path;
	}

	/**
	 * Get all available templates in this repository
	 */
	getTemplates(): Template[] {
		return this.templateDescriptors.map(
			(td) => new Template(td),
		);
	}

	/**
	 * Returns true if this repository contains a template with the provided name
	 * @param templateName to search for
	 */
	hasTemplate(templateName: string): boolean {
		const descriptor = this.templateDescriptors.find(({ name }) => name === templateName);

		if (!descriptor) {
			return false;
		}

		return true;
	}

	/**
	 * Return a template from this repository if it exists
	 * @param templateName of template to retrieve
	 */
	getTemplate(templateName: string): Template {
		const descriptor = this.templateDescriptors.find(({ name }) => name === templateName);

		if (!descriptor) {
			throw new Error(`Template ${templateName} does not exist in repository ${this.name}`);
		}

		return new Template(descriptor);
	}

	/**
	 * Load a repository from a repository file
	 * @param file containing the repository descriptor
	 */
	static fromFile(file: string): Repository {
		const repoFile = YAML.parse(fs.readFileSync(file).toString()) as RepositoryFile;
		// TODO: Add repo file validation
		const repoName = path.dirname(file).split(path.sep).pop()!;
		return new Repository(repoName, path.join(file, '../'), repoFile.templates);
	}

	/**
	 * Load all repositories from a given directory
	 * @param path containing repository sub-directories
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
	 * Load all repositories from the default template directory
	 */
	static fromDefaultDirectory(): Repository[] {
		return Repository.fromDirectory(TEMPLATE_DIR);
	}

	/**
	 * Return flat list of available templates from a list of repositories
	 * @param repos to retrieve templates from
	 */
	static availableTemplates(repos: Repository[]): string[] {
		return repos.reduce(
			(acc, r) => [...acc, ...r.getTemplates().map((t) => `${r.name}/${t.name}`)],
			[] as string[],
		);
	}

	/**
	 * Checkout a template repository from a remote git repo
	 * @param name to give the repository locally
	 * @param url containing the repository git repository
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

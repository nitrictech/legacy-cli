import { NitricFunction } from '../types';
import { Stack } from './stack';
import path from 'path';
import { Repository, Template } from '../templates';
import fs from 'fs';
import tar from 'tar-fs';
import streamToPromise from 'stream-to-promise';

type omitMethods = 'getFunction' | 'getFunctions';

export class Function {
	// Back reference to the parent stack
	// emit getFunction here to prevent recursion
	private stack: Omit<Stack, omitMethods>;
	private descriptor: NitricFunction;

	constructor(stack: Stack, descriptor: NitricFunction) {
		this.stack = stack;
		this.descriptor = descriptor;
	}

	// Returns reference to parent stack sans ability to get methods
	getStack(): Omit<Stack, omitMethods> {
		return this.stack;
	}

	asNitricFunction(): NitricFunction {
		return this.descriptor;
	}

	getDirectory(): string {
		return path.join(this.stack.getDirectory(), this.descriptor.path);
	}

	getStagingDirectory(): string {
		return path.join(this.stack.getStagingDirectory(), this.descriptor.name);
	}

	getImageTagName(): string {
		return `${this.stack.getName()}-${this.descriptor.name}`;
	}

	// Find the template for a function from a given set of repositories
	static async findTemplateForFunction(f: Function, repos: Repository[]): Promise<Template> {
		const [repoName, tmplName] = f.descriptor.runtime.split('/');

		const repo = repos.find((r) => r.getName() === repoName);
		if (!repo) {
			throw new Error(`Repository ${repoName} could not be found`);
		}

		if (!repo.hasTemplate(tmplName)) {
			throw new Error(`Repository ${repoName} does not contain template ${tmplName}`);
		}

		return repo.getTemplate(tmplName);
	}

	// Stage the files for a function ready to build
	static async stage(f: Function, repos: Repository[]): Promise<void> {
		const functionStagingDir = f.getStagingDirectory();
		const template = await Function.findTemplateForFunction(f, repos);

		// TODO: Do we need to do this?
		await fs.promises.mkdir(functionStagingDir, { recursive: true });

		await Template.copyRuntimeTo(template, functionStagingDir);

		// TODO: Should we rm or exclude the code directory of the Template, to ensure
		// extra files don't make it through?
		const functionPipe = tar.extract(`${functionStagingDir}/function`);
		// Now we need to copy the actual function code, the the above directory/function directory
		const functionDirectory = f.getDirectory();

		// tar.pack(functionDirectory, packOptions).pipe(functionPipe);
		tar.pack(functionDirectory).pipe(functionPipe);

		await streamToPromise(functionPipe);
	}
}

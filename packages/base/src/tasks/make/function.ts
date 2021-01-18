// import { templateFunctionPath } from '../../common/paths';
import { NitricRuntime, readNitricDescriptor, writeNitricDescriptor, Task } from '@nitric/cli-common';
import { getTemplateCodePath, isTemplateAvailable } from '../../utils';

import tar from 'tar-fs';
import path from 'path';
import streamToPromise from 'stream-to-promise';
import fs from 'fs';

interface MakeFunctionTaskOpts {
	template: string;
	dir: string;
	file?: string;
	name: string;
}

export class MakeFunctionTask extends Task<void> {
	private functionName: string;
	private template: string;
	private file: string;
	private dir: string;

	constructor({ template, name, file = './nitric.yaml', dir }: MakeFunctionTaskOpts) {
		super(`Making Function ${name}`);
		this.template = template;
		this.functionName = name;
		this.file = file;
		this.dir = dir;
	}

	private async makeFunction(): Promise<string> {
		//TODO: validate inputs
		// Validate template is installed/exists
		//TODO: in future, we should attempt to download/install the template if possible
		if (!isTemplateAvailable(this.template)) {
			throw new Error(`Template ${this.template} is not available`);
		}
		this.update(`${this.template} template available locally`);

		const inPath = getTemplateCodePath(this.template);
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outPath = path.join(this.dir);
		if (fs.existsSync(outPath)) {
			throw new Error(`Function directory already exists: ${this.dir}`);
		}

		const outStream = tar.extract(outPath);
		tar.pack(inPath).pipe(outStream);
		this.update('creating function...');
		await streamToPromise(outStream);

		return `Created function ${this.functionName} based on template ${this.template}`;
	}

	async do(): Promise<void> {
		this.update('Checking stack descriptor');
		const nitricFile = this.file;
		const stack = readNitricDescriptor(nitricFile);

		const { functions = [] } = stack;

		if (functions.find((func) => func.name === this.functionName) !== undefined) {
			throw new Error(`Function ${this.functionName} already defined in ${this.file}`);
		}

		this.update('Start Make');

		await this.makeFunction();
		//then

		const functionFolder = this.dir;
		const nitricFileDir = path.dirname(nitricFile);

		this.update(`Updating ${this.file}`);

		stack.functions = [
			...functions,
			{
				name: this.functionName,
				path: path.relative(nitricFileDir, functionFolder),
				runtime: this.template as NitricRuntime,
			},
		];
		writeNitricDescriptor(stack, nitricFile);

		this.update(`Updated ${this.file}`);
	}
}

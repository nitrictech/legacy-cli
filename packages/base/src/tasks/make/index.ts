import { templateFunctionPath } from '../../common/paths';
import { isTemplateAvailable } from '../../utils';
import { readNitricDescriptor, writeNitricDescriptor, NitricRuntime, Task } from '@nitric/cli-common';
import tar from 'tar-fs';
import path from 'path';
import streamToPromise from 'stream-to-promise';
import fs from 'fs';
interface MakeFunctionTaskOpts {
	template: string;
	directory: string;
	file: string;
	name: string;
}

export class MakeFunctionTask extends Task<string> {
	private functionName: string;
	private template: string;
	private file: string;
	private directory: string;

	constructor({ template, name, file, directory }: MakeFunctionTaskOpts) {
		super(`Making Function ${name}`);
		this.template = template;
		this.functionName = name;
		this.file = file;
		this.directory = directory;
	}

	private async makeFunction(): Promise<string> {
		const { directory, template, functionName } = this;
		//TODO: validate inputs
		// Validate template is installed/exists
		//TODO: in future, we should attempt to download/install the template if possible
		if (!isTemplateAvailable(template)) {
			throw new Error(`Template ${template} is not available.`);
		}
		this.update(`${template} template available locally`);

		const inPath = templateFunctionPath(template);
		//TODO: should probably do something to make sure the file exists
		// Make a copy of the function template, using the new name in the output directory
		const outPath = path.join(directory, functionName);
		if (fs.existsSync(outPath)) {
			throw new Error(`Function directory already exists: ${functionName}`);
		}

		const outStream = tar.extract(outPath);
		tar.pack(inPath).pipe(outStream);
		this.update('creating function...');
		await streamToPromise(outStream);

		return `Created function ${functionName} based on template ${template}`;
	}

	async do(): Promise<string> {
		const { file, directory, functionName } = this;

		this.update('Checking stack descriptor');
		const nitricFile = path.join(directory, file);
		const stack = readNitricDescriptor(nitricFile);

		const { functions = [] } = stack;

		const functionDirectoryName = this.functionName
			.toLowerCase()
			.replace(/ /g, '-')
			.replace(/[^-a-z\d]/g, '');

		if (functions.find((func) => func.name === functionName) !== undefined) {
			throw new Error(`Function ${functionName} already defined in ${file}`);
		}

		this.update('Start Make');

		await this.makeFunction();
		//then

		const functionFolder = path.join(directory, functionDirectoryName);
		const nitricFileDirectory = path.dirname(nitricFile);

		this.update(`Updating ${file}`);

		stack.functions = [
			...functions,
			{
				name: this.functionName,
				path: path.relative(nitricFileDirectory, functionFolder),
				runtime: this.template as NitricRuntime,
			},
		];
		writeNitricDescriptor(stack, nitricFile);

		this.update(`Updated ${file}`);
		return `Updated ${file}`;
	}
}

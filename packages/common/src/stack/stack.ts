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
import { NitricFunction, NitricContainer, NitricStack } from '../types';
import fs from 'fs';
import YAML from 'yaml';
import { Template } from '../templates';
import { STAGING_DIR } from '../paths';
import { findFileRead } from '../utils';
import { StackSite, StackFunction, StackContainer } from '.';
import { validateStack } from './schema';

const NITRIC_DIRECTORY = '.nitric';

/**
 * Represents a Nitric Project Stack, including resources and their configuration
 */
export class Stack<
	FunctionExtensions = Record<string, any>,
	ContainerExtensions = Record<string, any>,
	BucketExtensions = Record<string, any>,
	TopicExtensions = Record<string, any>,
	QueueExtensions = Record<string, any>,
	ScheduleExtensions = Record<string, any>,
	ApiExtensions = Record<string, any>,
	SiteExtensions = Record<string, any>,
	EntrypointExtensions = Record<string, any>,
> {
	private file: string;
	private name: string;
	private descriptor: NitricStack<
		FunctionExtensions,
		ContainerExtensions,
		BucketExtensions,
		TopicExtensions,
		QueueExtensions,
		ScheduleExtensions,
		ApiExtensions,
		SiteExtensions,
		EntrypointExtensions
	>;

	constructor(
		file: string,
		descriptor: NitricStack<
			FunctionExtensions,
			ContainerExtensions,
			BucketExtensions,
			TopicExtensions,
			QueueExtensions,
			ScheduleExtensions,
			ApiExtensions,
			SiteExtensions,
			EntrypointExtensions
		>,
	) {
		this.name = descriptor.name;
		this.descriptor = descriptor;
		this.file = file;
	}

	/**
	 * Return the stack name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Return the descriptor for the stack
	 * @param noUndefined if true, removes undefined top level properties from the description.
	 * Useful when writing to a config file such as YAML and empty optional properties are undesirable.
	 */
	asNitricStack(
		noUndefined = false,
	): NitricStack<
		FunctionExtensions,
		ContainerExtensions,
		BucketExtensions,
		TopicExtensions,
		QueueExtensions,
		ScheduleExtensions,
		ApiExtensions,
		SiteExtensions,
		EntrypointExtensions
	> {
		return Object.keys(this.descriptor)
			.filter((k) => this.descriptor[k] != undefined || !noUndefined)
			.reduce((acc, k) => ({ ...acc, [k]: this.descriptor[k] }), {}) as NitricStack<
			FunctionExtensions,
			ContainerExtensions,
			BucketExtensions,
			TopicExtensions,
			QueueExtensions,
			ScheduleExtensions,
			ApiExtensions,
			SiteExtensions,
			EntrypointExtensions
		>;
	}

	/**
	 * Return the directory containing this stack (the parent directory of the stack definition file)
	 */
	getDirectory(): string {
		return path.dirname(this.file);
	}

	/**
	 * Add a function to the stack
	 * @param name of the new function, which much not already be present in the stack's functions or containers
	 * @param func the function descriptor to add
	 */
	addFunction(name: string, func: NitricFunction<FunctionExtensions>): Stack {
		const { descriptor } = this;
		const { functions = {}, containers = {} } = this.descriptor;

		if (functions[name] || containers[name]) {
			throw new Error(`Function ${name} already defined in ${this.file}`);
		}

		this.descriptor = {
			...descriptor,
			functions: {
				...functions,
				[name]: func,
			},
		};

		return this;
	}

	/**
	 * Return a function from the stack by name
	 * @param name of the function
	 */
	getFunction(name: string): StackFunction {
		const { descriptor } = this;
		const { functions = {} } = descriptor;

		if (!functions[name]) {
			throw new Error(`Stack ${this.name}, does not contain service ${name}`);
		}

		return new StackFunction(this, name, functions[name]);
	}

	/**
	 * Return all functions in the stack
	 */
	getFunctions(): StackFunction[] {
		const { descriptor } = this;
		const { functions = {} } = descriptor;

		return Object.keys(functions).map((funcName) => new StackFunction(this, funcName, functions[funcName]));
	}

	/**
	 * Add a source to the stack
	 * @param name of the new source, which much not already be present in the stack's functions or containers
	 * @param container the source descriptor to add
	 */
	addContainer(name: string, container: NitricContainer<ContainerExtensions>): Stack {
		const { descriptor } = this;
		const { containers = {}, functions = {} } = this.descriptor;

		if (containers[name] || functions[name]) {
			throw new Error(`Container ${name} already defined in ${this.file}`);
		}

		this.descriptor = {
			...descriptor,
			containers: {
				...containers,
				[name]: container,
			},
		};

		return this;
	}

	/**
	 * Return a source from the stack by name
	 * @param name of the source
	 */
	getContainer(name: string): StackContainer {
		const { descriptor } = this;
		const { containers = {} } = descriptor;

		if (!containers[name]) {
			throw new Error(`Stack ${this.name}, does not contain container ${name}`);
		}

		return new StackContainer(this, name, containers[name]);
	}

	/**
	 * Return all containers in the stack
	 */
	getContainers(): StackContainer[] {
		const { descriptor } = this;
		const { containers = {} } = descriptor;

		return Object.keys(containers).map(
			(containerName) => new StackContainer(this, containerName, containers[containerName]),
		);
	}

	/**
	 * Return all sites (static sites) in the stack
	 */
	getSites(): StackSite[] {
		const { descriptor } = this;
		const { sites = {} } = descriptor;

		return Object.keys(sites).map((siteName) => new StackSite(this, siteName, sites[siteName]));
	}

	/**
	 * Get the directory used to perform build operations for this stack and its resources
	 */
	getStagingDirectory(): string {
		return path.join(STAGING_DIR, this.name);
	}

	/**
	 * Make a directory relative to the stack directory and return its path
	 * @param directory path to be made
	 * @private
	 */
	private async makeRelativeDirectory(directory: string): Promise<string> {
		const dir = path.join(this.getDirectory(), directory);

		if (!fs.existsSync(dir)) {
			await fs.promises.mkdir(dir, { recursive: true });
		}

		return dir;
	}

	async hasTemplate(templateName: string): Promise<boolean> {
		const templateDir = await this.getTemplatesDirectory();
		return fs.existsSync(path.join(templateDir, templateName));
	}

	/**
	 * Create the nitric directory if it doesn't exist and return its path
	 */
	async makeNitricDirectory(): Promise<string> {
		return await this.makeRelativeDirectory(`./${NITRIC_DIRECTORY}/`);
	}

	/**
	 * Create the nitric log directory if it doesn't exist and return its path
	 */
	async makeLoggingDirectory(): Promise<string> {
		return await this.makeRelativeDirectory(`./${NITRIC_DIRECTORY}/logs/`);
	}

	async makeTemplatesDirectory(): Promise<string> {
		return await this.makeRelativeDirectory(`./${NITRIC_DIRECTORY}/templates/`);
	}

	async getTemplatesDirectory(): Promise<string> {
		return await this.makeTemplatesDirectory();
	}

	/**
	 * Pulls a template for local versioning as part of this stack
	 * @param template
	 */
	async pullTemplate(template: Template): Promise<void> {
		const templateDir = await this.getTemplatesDirectory();
		const templatePath = path.join(templateDir, template.getFullName());
		await Template.copyTo(template, templatePath);
	}

	async getTemplate(templateName: string): Promise<Template> {
		const hasTemplate = await this.hasTemplate(templateName);
		if (hasTemplate) {
			const [repoName, tName] = templateName.split('/');
			const templatesDir = await this.getTemplatesDirectory();
			return new Template(repoName, tName, 'any', path.join(templatesDir, templateName));
		} else {
			throw new Error(`Stack does not have template: ${templateName}`);
		}
	}

	/**
	 * Return a new log file location. If the log directories are missing, they will be created.
	 * @param prefix used along with the current time to generate a unique log filename.
	 */
	async getLoggingFile(prefix: string): Promise<string> {
		const currentTime = new Date().getTime();
		const logFileName = `${prefix}-${currentTime}`;

		const loggingDirectory = await this.makeLoggingDirectory();

		return path.join(loggingDirectory, `./${logFileName}.log`);
	}

	/**
	 * Parse a Nitric Stack definition from the given file.
	 *
	 * @param file containing the serialized stack definition
	 * @param parser to parse the serialized file type, defaults to YAML parser.
	 */
	static async fromFile(file: string, parser: (content: string) => NitricStack = YAML.parse): Promise<Stack> {
		const { content, filePath } = (await findFileRead(file)) || {};

		if (!content) {
			throw new Error(`Nitric Stack file not found. Add ${file} to your project or home directory.`);
		}

		const stack = parser(content);
		// validate the stack against the schema and throw in case of errors.
		validateStack(stack);

		return new Stack(filePath || file, stack);
	}

	/**
	 * Write a stack to a given file
	 * @param stack to write
	 * @param file to write to
	 * @param stringify function to use to convert the stack to a string. Defaults to YAML.stringify.
	 */
	static async writeTo(
		stack: Stack,
		file: string,
		stringify: (obj: NitricStack) => string = YAML.stringify,
	): Promise<void> {
		const stackString = stringify(stack.asNitricStack(true)); //Turn object into yaml
		return await fs.promises.writeFile(file, stackString);
	}

	/**
	 * Write a stack back to the file it was loaded from
	 * @param stack to write
	 */
	static async write(stack: Stack): Promise<void> {
		return await Stack.writeTo(stack, stack.file);
	}

	/**
	 * Retrieve a nitric stack from a given directory assuming 'nitric.yaml' exists in the root
	 * @param dir path to the directory containing the stack definition file from
	 */
	static async fromDirectory(dir: string): Promise<Stack> {
		return Stack.fromFile(path.join(dir, './nitric.yaml'));
	}
}

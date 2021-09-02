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
import { STAGING_DIR } from '../paths';
import { findFileRead } from '../utils';
import { StackSite, StackFunction, StackContainer } from '.';
import { validateStack } from './schema';
import { StackAPI } from './api';

const NITRIC_DIRECTORY = '.nitric';

type comment = { before: string; inline: string };
type comments = { path: string[]; comment: comment }[];

const extractComments = (node, path: string[] = []): comments => {
	const comment = { before: node.commentBefore, inline: node.comment } as comment;
	const comments: comments = !!comment.before || !!comment.inline ? [{ path, comment }] : [];

	if (YAML.isDocument(node)) {
		return extractComments(node.contents, [...path, 'contents']);
	}
	if (YAML.isScalar(node)) {
		return comments;
	}
	if (YAML.isCollection(node)) {
		return node.items
			.map((ele, ix) => extractComments(ele, [...path, 'items', ix]))
			.reduce((acc, cur) => [...acc, ...cur], comments);
	}
	if (YAML.isPair(node)) {
		return [
			...comments,
			...extractComments(node.key, [...path, 'key']),
			...extractComments(node.value, [...path, 'value']),
		];
	}
	// unknown type, return it's comments, but stop the recursion here.
	return comments;
};

const insertComments = (node, comments: comments): YAML.Document => {
	comments.forEach(({ comment, path }) => {
		let pathPointer = node as any;
		for (let i = 0; i < path.length; i++) {
			if (pathPointer[path[i]]) {
				pathPointer = pathPointer[path[i]];
			} else {
				console.log(path.join('.'), ' not found, skipping reapplication of comments');
				break;
			}
		}
		pathPointer.commentBefore = comment.before;
		pathPointer.comment = comment.inline;
	});
	return node;
};

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
		SiteExtensions,
		EntrypointExtensions
	>;
	private readonly comments: comments;

	constructor(
		file: string,
		descriptor: NitricStack<
			FunctionExtensions,
			ContainerExtensions,
			BucketExtensions,
			TopicExtensions,
			QueueExtensions,
			ScheduleExtensions,
			SiteExtensions,
			EntrypointExtensions
		>,
		comments: comments = [],
	) {
		this.name = descriptor.name;
		this.descriptor = descriptor;
		this.file = file;
		this.comments = comments;
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
	 * Return a single API from the stack
	 * @param name - The name of the API to return
	 * @returns
	 */
	getApi(name: string): StackAPI {
		const { descriptor } = this;
		const { apis = {} } = descriptor;

		if (!apis[name]) {
			throw new Error(`Stack ${this.name}, does not contain service ${name}`);
		}

		return new StackAPI(this, name, apis[name]);
	}

	/**
	 * Return all APIs in the stack
	 * @returns
	 */
	getApis(): StackAPI[] {
		const { descriptor } = this;
		const { apis = {} } = descriptor;

		return Object.keys(apis).map((apiKey) => new StackAPI(this, apiKey, apis[apiKey]));
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
	 * @param file path to YAML file containing the serialized stack definition
	 */
	static async fromFile(file: string): Promise<Stack> {
		const { content, filePath } = (await findFileRead(file)) || {};

		if (!content) {
			throw new Error(`Nitric Stack file not found. Add ${file} to your project or home directory.`);
		}

		const doc = YAML.parseDocument(content);
		const stack = doc.toJS();
		// validate the stack against the schema and throw in case of errors.
		validateStack(stack, path.dirname(filePath || file));

		const comments = extractComments(doc);

		return new Stack(filePath || file, stack, comments);
	}

	/**
	 * Write a stack to a given YAML file
	 * @param stack to write
	 * @param file path to write the YAML file to
	 */
	static async writeTo(stack: Stack, file: string): Promise<void> {
		const doc = insertComments(new YAML.Document(stack.asNitricStack(true)), stack.comments);
		const stackString = doc.toString(); //Turn object into yaml
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

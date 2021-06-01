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
import { NitricService, NitricStack } from '../types';
import fs from 'fs';
import YAML from 'yaml';
import { Template } from '../templates';
import { STAGING_DIR } from '../paths';
import { Site } from './site';
import { findFileRead } from '../utils';
import { Service } from './service';

const NITRIC_DIRECTORY = '.nitric';

/**
 * Represents a Nitric Project Stack, including resources and their configuration
 */
export class Stack {
	private file: string;
	private name: string;
	private descriptor: NitricStack;

	constructor(file: string, descriptor: NitricStack) {
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
	asNitricStack(noUndefined = false): NitricStack {
		return Object.keys(this.descriptor)
			.filter((k) => this.descriptor[k] != undefined || !noUndefined)
			.reduce((acc, k) => ({ ...acc, [k]: this.descriptor[k] }), {}) as NitricStack;
	}

	/**
	 * Return the directory containing this stack (the parent directory of the stack definition file)
	 */
	getDirectory(): string {
		return path.dirname(this.file);
	}

	/**
	 * Add a service to the stack
	 * @param name of the new service, which much not already be present in the stack
	 * @param svc the service descriptor to add
	 */
	addService(name: string, svc: NitricService): Stack {
		const { descriptor } = this;
		const { services = {} } = this.descriptor;

		if (services[name]) {
			throw new Error(`Service ${name} already defined in ${this.file}`);
		}

		this.descriptor = {
			...descriptor,
			services: {
				...services,
				[name]: svc,
			},
		};

		return this;
	}

	/**
	 * Return a service from the stack by name
	 * @param name of the service
	 */
	getService(name: string): Service {
		const { descriptor } = this;
		const { services = {} } = descriptor;

		if (!services[name]) {
			throw new Error(`Stack ${this.name}, does not contain service ${name}`);
		}

		return new Service(this, name, services[name]);
	}

	/**
	 * Return all services in the stack
	 */
	getServices(): Service[] {
		const { descriptor } = this;
		const { services = {} } = descriptor;

		return Object.keys(services).map((svcName) => new Service(this, svcName, services[svcName]));
	}

	/**
	 * Return all sites (static sites) in the stack
	 */
	getSites(): Site[] {
		const { descriptor } = this;
		const { sites = {} } = descriptor;

		return Object.keys(sites).map((siteName) => new Site(this, siteName, sites[siteName]));
	}

	/**
	 * Get the directory used to perform build operations for this stack and its resources
	 */
	getStagingDirectory(): string {
		return `${STAGING_DIR}/${this.name}`;
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
		await this.makeRelativeDirectory(templatePath);
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

	/**
	 * Stage the stack after deleting any existing staging files.
	 * TODO: We'll want to decompose this into more functions
	 * @param stack to stage
	 */
	//static async stage(stack: Stack): Promise<void> {
	//	const repos = Repository.fromDefaultDirectory();

	//	const stackStagingDirectory = stack.getStagingDirectory();

	//	// Clean staging directory
	//	if (fs.existsSync(stackStagingDirectory)) {
	//		await new Promise<void>((res, rej) => {
	//			rimraf(stackStagingDirectory, (err) => {
	//				if (err) {
	//					rej(err);
	//				} else {
	//					res();
	//				}
	//			});
	//		});
	//	}

	//	await fs.promises.mkdir(stackStagingDirectory, { recursive: true });

	//	// Stage each function
	//	await Promise.all(stack.getServices().map(async (s) => Service.stage(s, repos)));
	//}
}

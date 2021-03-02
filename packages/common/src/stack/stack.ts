import path from 'path';
import {
	NitricBucket,
	NitricTopic,
	NitricQueue,
	NitricFunction,
	NitricSchedule,
	NitricStack,
	NitricAPI,
	NitricStaticSite,
	NitricEntrypoints,
} from '../types';
import fs from 'fs';
import YAML from 'yaml';
import { Repository } from '../templates';
import { STAGING_DIR } from '../paths';
import rimraf from 'rimraf';
import { Function } from './function';
import { Site } from './site';
import { findFileRead } from '../utils';
//import multimatch from 'multimatch';

export class Stack {
	private file: string;
	private name: string;
	private funcs?: NitricFunction[];
	private buckets?: NitricBucket[];
	private queues?: NitricQueue[];
	private topics?: NitricTopic[];
	private schedules?: NitricSchedule[];
	private apis?: NitricAPI[];
	private sites?: NitricStaticSite[];
	private entrypoints?: NitricEntrypoints;

	constructor(file: string, { name, functions, topics, queues, buckets, schedules, apis, sites, entrypoints }: NitricStack) {
		this.file = file;
		this.name = name;
		this.funcs = functions;
		this.topics = topics;
		this.queues = queues;
		this.buckets = buckets;
		this.schedules = schedules;
		this.apis = apis;
		this.sites = sites;
		this.entrypoints = entrypoints;
	}

	getName(): string {
		return this.name;
	}

	asNitricStack(): NitricStack {
		return {
			name: this.name,
			functions: this.funcs,
			buckets: this.buckets,
			queues: this.queues,
			topics: this.topics,
			schedules: this.schedules,
			apis: this.apis,
			sites: this.sites,
			entrypoints: this.entrypoints,
		};
	}

	getDirectory(): string {
		return path.dirname(this.file);
	}

	addFunction(func: NitricFunction): Stack {
		const { funcs = [] } = this;

		// Name/path compound key, these should both be unique
		const existingFunction = funcs.find((f) => f.name === func.name || f.path === func.path);

		if (existingFunction) {
			throw new Error(`Function ${func.name} already defined in ${this.file}`);
		}

		this.funcs = [...(this.funcs || []), func];

		return this;
	}

	getFunction(funcName: string): Function {
		const func = (this.funcs || []).find((f) => f.name === funcName);

		if (!func) {
			throw new Error(`Stack ${this.name}, does not containe function ${funcName}`);
		}

		return new Function(this, func);
	}

	getFunctions(): Function[] {
		return (this.funcs || []).map((f) => new Function(this, f));
	}

	getSites(): Site[] {
		return (this.sites || []).map(s => new Site(this, s));
	}

	getStagingDirectory(): string {
		return `${STAGING_DIR}/${this.name}`;
	}

	/**
	 * Parse a Nitric Stack definition from the given file.
	 *
	 * @param file containing the serialized stack definition
	 * @param parser to parse the serialized file type, defaults to YAML parser.
	 */
	static async fromFile(file: string, parser: (content: string) => NitricStack = YAML.parse): Promise<Stack> {
		const content = await findFileRead(file);

		if (!content) {
			throw new Error(`Nitric Stack file not found. Add ${file} to your project or home directory.`);
		}

		const stack = parser(content);
		return new Stack(file, stack);
	}

	/**
	 * Write a stack to a given file
	 * @param stack
	 * @param file
	 */
	static async writeTo(
		stack: Stack,
		file: string,
		stringify: (obj: NitricStack) => string = YAML.stringify,
	): Promise<void> {
		return await fs.promises.writeFile(file, stringify(stack.asNitricStack()));
	}

	/**
	 * Write stack to the file it was loaded from
	 * @param stack
	 */
	static async write(stack: Stack): Promise<void> {
		return await Stack.writeTo(stack, stack.file);
	}

	/**
	 * Retrive a nitric stack from a given directory assuming 'nitric.yaml' exists in the root
	 * @param dir
	 */
	static async fromDirectory(dir: string): Promise<Stack> {
		return Stack.fromFile(path.join(dir, './nitric.yaml'));
	}

	/**
	 * The stack to prepare for staging
	 * TODO: We'll want to decompose this into more functions
	 * @param stack
	 */
	static async stage(stack: Stack): Promise<void> {
		const repos = Repository.fromDefaultDirectory();

		const stackStagingDirectory = stack.getStagingDirectory();

		// Clean staging directory
		if (fs.existsSync(stackStagingDirectory)) {
			await new Promise<void>((res, rej) => {
				rimraf(stackStagingDirectory, (err) => {
					if (err) {
						rej(err);
					} else {
						res();
					}
				});
			});
		}

		await fs.promises.mkdir(stackStagingDirectory, { recursive: true });

		// Stage each function
		await Promise.all(stack.getFunctions().map(async (f) => Function.stage(f, repos)));
	}
}

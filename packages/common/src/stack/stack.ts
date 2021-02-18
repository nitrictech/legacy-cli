import path from 'path';
import {
	NitricBucket,
	NitricTopic,
	NitricQueue,
	NitricFunction,
	NitricSchedule,
	NitricStack,
	NitricAPI,
} from '../types';
import fs from 'fs';
import YAML from 'yaml';
import { Repository, Template } from '../templates';
import { STAGING_DIR } from '../paths';
import tar from 'tar-fs';
import streamToPromise from 'stream-to-promise';
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

	constructor(file: string, { name, functions, topics, queues, buckets, schedules, apis }: NitricStack) {
		this.file = file;
		this.name = name;
		this.funcs = functions;
		this.topics = topics;
		this.queues = queues;
		this.buckets = buckets;
		this.schedules = schedules;
		this.apis = apis;
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
		};
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

	/**
	 * Parse a Nitric Stack definition from the given file.
	 *
	 * @param file containing the serialized stack definition
	 * @param parser to parse the serialized file type, defaults to YAML parser.
	 */
	static async fromFile(file: string, parser: (content: string) => NitricStack = YAML.parse): Promise<Stack> {
		const content = await fs.promises.readFile(file);
		const stack = parser(content.toString('utf-8'));
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

		const stackStagingDirectory = `${STAGING_DIR}/${stack.name}`;

		// Clean staging directory
		if (fs.existsSync(stackStagingDirectory)) {
			await fs.promises.rmdir(stackStagingDirectory);
		}
		
		await fs.promises.mkdir(stackStagingDirectory, { recursive: true });
		
		// Stage each function
		await Promise.all(stack.funcs!.map(async (f) => {
			const functionStagingDir = path.join(stackStagingDirectory, f.name);
			const [repoName, tmplName] = f.runtime.split('/');

			const repo = repos.find(r => r.getName() === repoName);
			if (!repo) {
				throw new Error(`Repository ${repoName} could not be found`);
			}

			if (!repo.hasTemplate(tmplName)) {
				throw new Error(`Repository ${repoName} does not contain template ${tmplName}`);
			}

			const template = repo.getTemplate(tmplName);

			// TODO: Do we need to do this?
			await fs.promises.mkdir(functionStagingDir, { recursive: true });

			await Template.copyRuntimeTo(template, functionStagingDir);

			// TODO: Should we rm or exclude the code directory of the Template, to ensure
			// extra files don't make it through?
			const functionPipe = tar.extract(`${functionStagingDir}/function`);
			// Now we need to copy the actual function code, the the above directory/function directory
			const functionDirectory = path.join(path.dirname(stack.file), f.path);

			// tar.pack(functionDirectory, packOptions).pipe(functionPipe);
			tar.pack(functionDirectory).pipe(functionPipe);
			
			await streamToPromise(functionPipe);
		}));
	}
}

import { NITRIC_HOME, STAGING_DIR, TEMPLATE_DIR } from '../../common/paths';
import fs from 'fs';
import rimraf from 'rimraf';
import {
	dockerodeEvtToString,
	NitricStack,
	NitricFunction,
	NitricImage,
	Task,
	getTagNameForFunction,
} from '@nitric/cli-common';
import { getTemplateLocation, isTemplateAvailable } from '../../utils';
import tar from 'tar-fs';
import Docker from 'dockerode';
import streamToPromise from 'stream-to-promise';
import path from 'path';
import multimatch from 'multimatch';
import execa from 'execa';

export function createNitricHome(): void {
	if (!fs.existsSync(NITRIC_HOME)) {
		fs.mkdirSync(NITRIC_HOME);
	}
}

export function createTemplateDirectory(): void {
	createNitricHome();
	// create temporary staging directory
	if (!fs.existsSync(TEMPLATE_DIR)) {
		fs.mkdirSync(TEMPLATE_DIR);
	}
}

export function createStagingDirectory(): void {
	createNitricHome();
	if (!fs.existsSync(STAGING_DIR)) {
		fs.mkdirSync(STAGING_DIR);
	}
}

function getDockerIgnoreFiles(dir: string): string[] {
	const dockerIgnoreFile = path.join(dir, '.dockerignore');

	if (fs.existsSync(dockerIgnoreFile)) {
		// Read the file and return its contents split by new line
		return fs.readFileSync(dockerIgnoreFile).toString().split('\n');
	}

	return [];
}

/**
 * Stage application resources ready for building
 * @param {NitricStack} stack
 */
export function stageStack(stack: NitricStack): void {
	createNitricHome();
	createTemplateDirectory();
	createStagingDirectory();

	const stackDirectory = `${STAGING_DIR}/${stack.name}`;

	// create temporary staging directory
	// TO DO: There should be one staging directory per function being built (or sub dirs)
	if (fs.existsSync(stackDirectory)) {
		rimraf.sync(stackDirectory);
	}

	// Use the stack name for staging builds
	// this assumed user stacks have unique names (hopefully)
	// however we may need a more robust solution to this...
	fs.mkdirSync(`${STAGING_DIR}/${stack.name}`);

	// Copy everything into the stack directory
}

interface BuildFunctionTaskOptions {
	stackName: string;
	baseDir: string;
	func: NitricFunction;
	provider?: string;
}

export class BuildFunctionTask extends Task<NitricImage> {
	private func: NitricFunction;
	private baseDir: string;
	private stackName: string;
	private provider: string;

	constructor({ func, baseDir, stackName, provider = 'local' }: BuildFunctionTaskOptions) {
		super(`${func.name}`);
		this.func = func;
		this.baseDir = baseDir;
		this.stackName = stackName;
		this.provider = provider;
	}

	async do(): Promise<NitricImage> {
		const docker = new Docker();
		const functionStagingDirectory = path.join(STAGING_DIR, this.stackName, this.func.name);
		const excludeFiles = this.func.excludes || [];

		// Setup template staging dir
		const templatePipe = tar.extract(functionStagingDirectory);
		// Setup user /function staging dir
		const functionPipe = tar.extract(`${functionStagingDirectory}/function`);

		// Validate template is installed/exists
		// TO DO: in future, we should attempt to download/install the template if possible
		if (!isTemplateAvailable(this.func.runtime)) {
			throw new Error(`Template ${this.func.runtime} is not available.`);
		}

		const functionDirectory = path.join(this.baseDir, this.func.path);
		const templateDirectory = getTemplateLocation(this.func.runtime);

		// Run provdided build scripts if any relative to
		// the function project
		if (this.func.buildScripts) {
			this.update('executing build scripts');
			// Run build scripts using execa
			this.func.buildScripts.map((script) => {
				this.update(`executing build script: ${script}`);
				return execa.commandSync(script, {
					cwd: functionDirectory,
				});
			});
		}

		const excludes = [...excludeFiles, ...getDockerIgnoreFiles(templateDirectory)];

		// Copy runtime template and /function to staging dir
		tar.pack(templateDirectory).pipe(templatePipe);
		await streamToPromise(templatePipe);
		let packOptions = {};
		if (excludes.length) {
			packOptions = {
				...packOptions,
				ignore: (entry: string): boolean => multimatch(entry, excludes).length > 0,
			};
		}

		tar.pack(functionDirectory, packOptions).pipe(functionPipe);
		await streamToPromise(functionPipe);

		// Tarball the required files for the image build
		const pack = tar.pack(functionStagingDirectory);

		const options = {
			buildargs: {
				PROVIDER: this.provider,
			},
			t: getTagNameForFunction(this.stackName, this.provider, this.func),
		};

		let stream: NodeJS.ReadableStream;
		try {
			stream = await docker.buildImage(pack, options);
		} catch (error) {
			if (error.errno && error.errno === -61) {
				throw new Error('Unable to connect to docker, is it running locally?');
			}
			throw error;
		}

		// Get build updates
		const buildResults = await new Promise<any[]>((resolve, reject) => {
			docker.modem.followProgress(
				stream,
				(errorInner: Error, resolveInner: Record<string, any>[]) =>
					errorInner ? reject(errorInner) : resolve(resolveInner),
				(event: any) => {
					try {
						this.update(dockerodeEvtToString(event));
					} catch (error) {
						reject(new Error(error.message.replace(/\n/g, '')));
					}
				},
			);
		});

		const filteredResults = buildResults.filter((obj) => 'aux' in obj && 'ID' in obj['aux']);
		if (filteredResults.length > 0) {
			const imageId = filteredResults[filteredResults.length - 1]['aux'].ID.split(':').pop() as string;
			return { id: imageId, func: this.func } as NitricImage;
		} else {
			const {
				errorDetail: { message },
			} = buildResults.pop() as any;
			throw new Error(message);
		}
	}
}

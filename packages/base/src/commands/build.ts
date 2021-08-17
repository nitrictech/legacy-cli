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

import { flags } from '@oclif/command';
import { wrapTaskForListr, Stack, NitricImage, BaseCommand } from '@nitric/cli-common';
import { BuildServiceTask } from '../tasks';
import { Listr, ListrTask } from 'listr2';
import path from 'path';
import execa from 'execa';

export function createBuildTasks(stack: Stack, directory: string, provider = 'local'): Listr {
	return new Listr(
		[
			{
				title: 'Building Services',
				task: (_, task): Listr =>
					task.newListr(
						// Create a sub-task to build each service in the project
						stack.getServices().map(
							(service): ListrTask => ({
								...wrapTaskForListr(
									new BuildServiceTask({
										stack,
										service,
										baseDir: directory,
										provider,
									}),
								),
								options: {
									persistentOutput: true,
								},
							}),
						),
						{
							concurrent: true,
							// Don't fail all on a single function failure...
							exitOnError: true,
							// Added to allow custom handling of SIGINT for run cmd cleanup.
							registerSignalListeners: false,
						},
					),
			},
		],
		{
			// Added to allow custom handling of SIGINT for run cmd cleanup.
			registerSignalListeners: false,
		},
	);
}

/**
 * Nitric CLI build command
 * Will use docker to build application services as docker images
 * ready to be executed on a CaaS
 */
export default class Build extends BaseCommand {
	static description = 'build a project';

	static examples = [`$ nitric build .`];

	static flags = {
		...BaseCommand.flags,
		file: flags.string({
			description: 'the stack definition file (default: ./nitric.yaml)',
		}),
		provider: flags.enum({
			char: 'p',
			description: 'the targeted provider for this build',
			options: ['local', 'gcp', 'aws'],
		}),
	};

	static args = [
		{
			name: 'directory',
			description: 'The project directory to build from',
			required: false,
		},
	];

	async do(): Promise<{ [key: string]: NitricImage }> {
		const { args, flags } = this.parse(Build);
		const { directory = '.' } = args;
		const { file = './nitric.yaml', provider = 'local' } = flags;
		const stack = await Stack.fromFile(path.join(directory, file));

		// Check docker daemon is running
		try {
			execa.sync('docker', ['ps']);
		} catch {
			throw new Error(
				'Docker daemon was not found!\nTry using `nitric doctor` to confirm it is correctly installed, and check that the service is running.',
			);
		}

		try {
			return await createBuildTasks(stack, directory, provider).run();
		} catch (error) {
			const origErrs = error.errors && error.errors.length ? error.errors : error;
			throw new Error(`Something went wrong, see error details.\n ${origErrs}`);
		}
	}
}

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

import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Stack, NitricImage, StageStackTask } from '@nitric/cli-common';
import { BuildFunctionTask } from '../tasks/build';
import { Listr, ListrTask } from 'listr2';
import path from 'path';

export function createBuildTasks(stack: Stack, directory: string, provider = 'local'): Listr {
	const nitricStack = stack.asNitricStack();

	return new Listr(
		[
			wrapTaskForListr(new StageStackTask({ stack })),
			{
				title: 'Building Functions',
				task: (_, task): Listr =>
					task.newListr(
						nitricStack.functions!.map(
							(func): ListrTask => ({
								...wrapTaskForListr(
									new BuildFunctionTask({
										func,
										baseDir: directory,
										stackName: nitricStack.name,
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
 * Will use docker to build the users application as a docker image
 * ready to be executed on a CaaS
 */
export default class Build extends Command {
	static description = 'Builds a project';

	static examples = [`$ nitric build .`];

	static flags = {
		help: flags.help({ char: 'h' }),
		file: flags.string(),
		provider: flags.enum({
			char: 'p',
			options: ['local', 'gcp', 'aws'],
		}),
	};

	static args = [
		{
			name: 'directory',
		},
	];

	async run(): Promise<{ [key: string]: NitricImage }> {
		const { args, flags } = this.parse(Build);
		const { directory = '.' } = args;
		const { file = './nitric.yaml', provider = 'local' } = flags;
		const stack = await Stack.fromFile(path.join(directory, file));

		try {
			return await createBuildTasks(stack, directory, provider).run();
		} catch (error) {
			const origErrs = error.errors && error.errors.length ? error.errors : error;
			throw new Error(`Something went wrong, see error details inline above.\n ${origErrs}`);
		}
	}
}

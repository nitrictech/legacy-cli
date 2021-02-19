import { Command, flags } from '@oclif/command';
import { wrapTaskForListr, Stack, NitricImage, StageStackTask } from '@nitric/cli-common';
import { BuildFunctionTask } from '../tasks/build';
import Listr, { ListrTask } from 'listr';
import path from 'path';

export function createBuildTasks(stack: Stack, directory: string, provider = 'local'): Listr {
	const nitricStack = stack.asNitricStack();

	return new Listr([
		wrapTaskForListr(new StageStackTask({ stack })),
		{
			title: 'Building Functions',
			task: (): Listr =>
				new Listr(
					nitricStack.functions!.map(
						(func): ListrTask =>
							wrapTaskForListr(
								new BuildFunctionTask({
									func,
									baseDir: directory,
									stackName: nitricStack.name,
									provider,
								}),
							),
					),
					{
						concurrent: true,
						// Don't fail all on a single function failure...
						exitOnError: false,
					},
				),
		},
	]);
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

import { Command, flags } from '@oclif/command';
import { readNitricDescriptor, wrapTaskForListr, NitricStack, NitricImage } from '@nitric/cli-common';
import { BuildFunctionTask } from '../tasks/build';
import Listr, { ListrTask } from 'listr';
import path from 'path';

export function createBuildTasks(stack: NitricStack, directory: string, provider: string = 'local'): Listr {
	return new Listr([
		{
			title: 'Building Functions',
			task: (): Listr =>
				new Listr(
					stack.functions!.map(
						(func): ListrTask =>
							wrapTaskForListr(
								new BuildFunctionTask({
									func,
									baseDir: directory,
									stackName: stack.name,
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
 * Cloudless CLI build command
 * Will use docker to build the users application as a docker image
 * ready to be executed on a CaaS
 */
export default class Build extends Command {
	static description = 'Builds a nitric project';

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
		const stack = readNitricDescriptor(path.join(directory, file));

		try {
			return await createBuildTasks(stack, directory, provider).run();
		} catch (error) {
			throw new Error('Something went wrong, see error details inline above.');
		}
	}
}

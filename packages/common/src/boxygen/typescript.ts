import { Image } from '@nitric/boxygen';

export const TS_IGNORE = ['node_modules/', '.nitric/', '.git/', '.idea/'];

export const baseTsFunction = async (image: Image): Promise<void> => {
	image
		.run(['yarn', 'global', 'add', 'typescript'])
		.run(['yarn', 'global', 'add', 'ts-node'])
		.copy('package.json *.lock *-lock.json', '/')
		.run(['yarn', 'import', '||', 'echo', '"Lockfile already exists"'])
		.run([
			'set',
			'-ex;',
			'yarn',
			'install',
			'--frozen-lockfile',
			'--cache-folder',
			'/tmp/.cache;',
			'rm',
			'-rf',
			'/tmp/.cache;',
		]);
};

export const configureTsFunction =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image.copy('.', '.').config({
			cmd: ['ts-node', '-T', handler],
		});
	};

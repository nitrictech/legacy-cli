import { Image } from '@nitric/boxygen';

export const JS_IGNORE = ['node_modules/', '.nitric/', '.git/', '.idea/'];

export const javascript =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image
			.copy('package.json *.lock *-lock.json', '/')
			.run(['yarn', 'import', '||', 'echo', '"Lockfile already exists'])
			.run([
				'set',
				'-ex;',
				'yarn',
				'install',
				'--production',
				'--frozen-lockfile',
				'--cache-folder',
				'/tmp/.cache;',
				'rm',
				'-rf',
				'/tmp/.cache;',
			])
			.copy('.', '.')
			.config({
				cmd: ['node', handler],
			});
	};

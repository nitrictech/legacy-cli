import { Image } from '@nitric/boxygen';

export const buildGoApp =
	(handler: string, exeOut: string) =>
	async (image: Image): Promise<void> => {
		image
			.run(['apk', 'update'])
			.run(['apk', 'upgrade'])
			.run(['apk', 'add', '--no-cache', 'git', 'gcc', 'g++', 'make'])
			.config({
				workDir: '/app/',
			})
			.copy('go.mod *.sum', '.')
			.run(['go', 'mod', 'download'])
			.copy('.', '.')
			.run(['CGO_ENABLED=0', 'GOOS=linux', 'go', 'build', '-o', `${exeOut}`, `${handler}`]);
	};

export const buildGoFinal =
	(buildStage: Image, srcExe: string) =>
	async (image: Image): Promise<void> => {
		image
			.copy(srcExe, '/bin/function', { from: buildStage })
			.run(['chmod', '+x-rw', '/bin/function'])
			.config({
				ports: [9001],
				workDir: '/',
				cmd: ['/bin/function'],
			});
	};

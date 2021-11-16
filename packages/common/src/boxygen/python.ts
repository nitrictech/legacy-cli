import { Image } from '@nitric/boxygen';

export const PYTHON_IGNORE = ['__pycache__/', '*.py[cod]', '*$py.class'];

export const python =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image
			.run(['pip', 'install', '--upgrade', 'pip'])
			.config({ workDir: '/app/' })
			.copy('requirements.txt', 'requirements.txt')
			.run(['pip', 'install', '--no-cache-dir', '-r', 'requirements.txt'])
			.copy('.', '.')
			.config({
				env: {
					PYTHON_PATH: '/app/:${PYTHON_PATH}',
				},
				ports: [9001],
				cmd: ['python', handler],
			});
	};

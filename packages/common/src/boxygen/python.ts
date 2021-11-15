import { Image } from '@nitric/boxygen';

export const PYTHON_IGNORE = ['__pycache__/', '*.py[cod]', '*$py.class'];

export const python =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image
			.run(['pip', 'install', '--upgrade', 'pip'])
			.copy('requirements.txt', 'requirements.txt')
			.run(['pip', 'install', '--no-cache-dir', '-r', 'requirements.txt'])
			.copy('.', '.')
			.config({
				ports: [9001],
				cmd: ['python', handler],
			});
	};

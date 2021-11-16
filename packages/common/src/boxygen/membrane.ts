import { Image } from '@nitric/boxygen';

export const installMembrane =
	(provider: string, version: string = 'latest') =>
	async (image: Image): Promise<void> => {
		let fetchFrom = `https://github.com/nitrictech/nitric/releases/download/${version}/membrane-${provider}`;
		if (version === 'latest') {
			fetchFrom = `https://github.com/nitrictech/nitric/releases/${version}/download/membrane-${provider}`;
		}
		image
			.add(fetchFrom, '/usr/local/bin/membrane')
			.run(['chmod', '+x-rw', '/usr/local/bin/membrane'])
			.config({
				entrypoint: ['/usr/local/bin/membrane'],
			});
	};

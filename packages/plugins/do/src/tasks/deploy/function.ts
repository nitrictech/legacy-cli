import { Function } from '@nitric/cli-common';
import * as digitalocean from '@pulumi/digitalocean';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';

interface NormalizedFunctionEntrypoint {
	path: string;
	name: string;
	type: 'function' | 'site' | 'api';
}

export function createFunction(
	func: Function,
	registryName: string,
	token: string,
	entrypoints: NormalizedFunctionEntrypoint[],
): digitalocean.types.input.AppSpecService {
	const nitricFunction = func.asNitricFunction();
	// Push the image
	const image = new docker.Image(`${func.getImageTagName()}-image`, {
		imageName: pulumi.interpolate`registry.digitalocean.com/${registryName}/${nitricFunction.name}`,
		build: {
			// Staging directory
			context: func.getStagingDirectory(),
			args: {
				PROVIDER: 'do',
			},
			// Create a reasonable shared memory space for image builds
			extraOptions: ['--shm-size', '1G'],
		},
		registry: {
			server: 'registry.digitalocean.com',
			username: token,
			password: token,
		},
	});

	// Need to await the image, so we'll apply this to ensure there is a dependency on the deployment
	const imageName = image.baseImageName.apply((bin) => bin.split('/').pop()!);

	return {
		name: nitricFunction.name,
		httpPort: 9001,
		image: {
			registryType: 'DOCR',
			// TODO: Apply docker deployed repository here...
			repository: imageName,
		},
		routes: entrypoints.filter(({ name }) => name === nitricFunction.name).map(({ path }) => ({ path })),
	};
}

// Copyright 2021, Nitric Pty Ltd.
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

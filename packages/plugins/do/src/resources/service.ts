// Copyright 2021, Nitric Technologies Pty Ltd.
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
import { Service } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { Output } from '@pulumi/pulumi';

/**
 * Nitric Service for Digital Ocean
 */
interface NitricServiceDockerImageArgs {
	service: Service;
	registryName: string;
	token: string;
}

export class NitricServiceDockerImage extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly repository: Output<string>;
	public readonly image: docker.Image;

	constructor(name: string, args: NitricServiceDockerImageArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:do:ServiceImage', name, {}, opts);

		this.name = name;

		const { service, registryName, token } = args;

		this.image = new docker.Image(`${service.getImageTagName()}-image`, {
			imageName: pulumi.interpolate`registry.digitalocean.com/${registryName}/${service.getName()}`,
			build: {
				// Staging directory
				context: service.getStagingDirectory(),
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

		this.repository = this.image.imageName.apply((name) => name.split('/').pop()!.split(':')[0] as string);

		this.registerOutputs({
			name: this.name,
			image: this.image,
			repository: this.repository,
		});
	}
}

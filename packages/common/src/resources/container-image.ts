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
import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { StackContainer } from '../stack';
import path from 'path';
import { MembraneProviders } from '../types';

interface NitricContainerImageArgs {
	container: StackContainer;
	username: pulumi.Input<string>;
	password: pulumi.Input<string>;
	imageName: pulumi.Input<string>;
	server: pulumi.Input<string>;
	nitricProvider: pulumi.Input<MembraneProviders>;
}

/**
 * Image deployment for a custom source in a Nitric project
 */
export class NitricContainerImage extends pulumi.ComponentResource {
	/**
	 * Just the image name
	 */
	public readonly name: pulumi.Output<string>;

	/**
	 * The full image URI
	 */
	public readonly imageUri: pulumi.Output<string>;

	/**
	 * The full image name including tag name
	 */
	public readonly baseImageName: pulumi.Output<string>;

	/**
	 * Unique image digest
	 */
	public readonly imageDigest: pulumi.Output<string>;

	constructor(name, args: NitricContainerImageArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:docker:Image', name, {}, opts);

		const { imageName, username, password, server, container, nitricProvider } = args;

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const context = container.getContext();
		const dockerfile = path.join(context, container.getDockerfile());

		const image = new docker.Image(
			`${container.getImageTagName()}-image`,
			{
				imageName,
				build: {
					// Staging directory
					context,
					args: {
						// TODO: consider a more collision safe name, e.g. NITRIC_PROVIDER_ID
						// Provider may not be used by all custom containers, given regardless
						PROVIDER: nitricProvider,
					},
					env: {
						DOCKER_BUILDKIT: '1',
					},
					dockerfile,
				},
				registry: {
					server,
					username,
					password,
				},
			},
			defaultResourceOptions,
		);

		image.imageName.apply((name) => name.split('/').pop()!.split(':')[0] as string);

		this.imageUri = image.imageName;
		this.name = image.imageName.apply((name) => name.split('/').pop()!.split(':')[0] as string);
		this.imageDigest = image.imageName.apply((name) => name.split('/').pop()!.split(':')[1] as string);
		this.baseImageName = image.baseImageName;

		this.registerOutputs({
			name: this.name,
			imageUri: this.imageUri,
			imageDigest: this.imageDigest,
			baseImageName: this.baseImageName,
		});
	}
}

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
import fs from 'fs';
import { StackFunction } from '../stack';
import path from 'path';
import { TMP_DIR } from '../paths';

interface NitricFunctionImageArgs {
	func: StackFunction;
	username: pulumi.Input<string>;
	password: pulumi.Input<string>;
	// Copy from an existing source image locally
	sourceImageName: pulumi.Input<string>;
	imageName: pulumi.Input<string>;
	server: pulumi.Input<string>;
}

const DUMMY_DOCKER_FILE = `
ARG SOURCE_IMAGE
FROM \${SOURCE_IMAGE}
`;

/**
 * Image deployment for a Nitric Func from a pre-built local image
 */
export class NitricFunctionImage extends pulumi.ComponentResource {
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

	constructor(name: string, args: NitricFunctionImageArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:docker:Image', name, {}, opts);

		const { imageName, sourceImageName, username, password, server, func } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const dummyDockerFilePath = path.join(TMP_DIR, 'dummy.dockerfile');

		fs.mkdirSync(TMP_DIR, { recursive: true });
		// write the dummy docker file
		fs.writeFileSync(dummyDockerFilePath, DUMMY_DOCKER_FILE);

		const image = new docker.Image(
			`${func.getImageTagName()}-image`,
			{
				imageName,
				build: {
					// Staging directory
					context: func.getDirectory(),
					args: {
						SOURCE_IMAGE: sourceImageName,
					},
					env: {
						DOCKER_BUILDKIT: '1',
					},
					dockerfile: dummyDockerFilePath,
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

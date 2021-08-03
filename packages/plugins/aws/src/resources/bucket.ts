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
import * as aws from '@pulumi/aws';
import { NamedObject, NitricBucket } from '@nitric/cli-common';

interface NitricBucketS3Args {
	bucket: NamedObject<NitricBucket>;
}

/**
 * Nitric S3 Bucket based static site
 */
export class NitricBucketS3 extends pulumi.ComponentResource {
	/**
	 * The name of the s3 site
	 */
	public readonly name: string;
	/**
	 * The deployed bucket
	 */
	public readonly s3: aws.s3.Bucket;

	constructor(name, args: NitricBucketS3Args, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:S3', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { bucket } = args;

		this.name = bucket.name;

		// Create a Bucket for the static content to reside in
		this.s3 = new aws.s3.Bucket(
			bucket.name,
			{
				tags: {
					'x-nitric-name': bucket.name,
				},
			},
			defaultResourceOptions,
		);

		this.registerOutputs({
			name: this.name,
			s3: this.s3,
		});
	}
}

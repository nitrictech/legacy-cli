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
import { NamedObject, NitricBucket } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';

interface NitricBucketCloudStorageArgs {
	bucket: NamedObject<NitricBucket>;
}

/**
 * Nitric Service deployed to Google Cloud Run
 */
export class NitricBucketCloudStorage extends pulumi.ComponentResource {
	public readonly storage: gcp.storage.Bucket;

	constructor(name: string, args: NitricBucketCloudStorageArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:CloudStorage', name, {}, opts);
		const { bucket } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		// Deploy the service
		this.storage = new gcp.storage.Bucket(
			bucket.name,
			{
				labels: {
					'x-nitric-name': bucket.name,
				},
			},
			defaultResourceOptions,
		);

		this.registerOutputs({
			storage: this.storage,
		});
	}
}

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
import { NamedObject, NitricBucket } from '@nitric/cli-common';
import { resources, storage } from '@pulumi/azure-native';

interface NitricAzureStorageBucketArgs {
	bucket: NamedObject<NitricBucket>;
	storageAcct: storage.StorageAccount;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure Storage based Bucket
 */
export class NitricAzureStorageBucket extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly container: storage.BlobContainer;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricAzureStorageBucketArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:AzureStorage', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, storageAcct, bucket } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.container = new storage.BlobContainer(
			bucket.name,
			{
				containerName: bucket.name,
				resourceGroupName: resourceGroup.name,
				accountName: storageAcct.name,
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			container: this.container,
			name: this.name,
		});
	}
}

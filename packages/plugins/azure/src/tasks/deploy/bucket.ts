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

import { NitricBucket } from '@nitric/cli-common';
import { storage, resources } from '@pulumi/azure-native';

/**
 * Creates an Azure storage container
 * @param resourceGroup - The resource group to create this container in
 * @param storageAcct - The Azure storage account to deploy the bucket to
 * @param bucket - The Nitric Bucket description we're deploying
 */
export function createBucket(
	resourceGroup: resources.ResourceGroup,
	storageAcct: storage.StorageAccount,
	bucket: NitricBucket,
): storage.BlobContainer {
	return new storage.BlobContainer(bucket.name, {
		containerName: bucket.name,
		resourceGroupName: resourceGroup.name,
		accountName: storageAcct.name,
	});
}

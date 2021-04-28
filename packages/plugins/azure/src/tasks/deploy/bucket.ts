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

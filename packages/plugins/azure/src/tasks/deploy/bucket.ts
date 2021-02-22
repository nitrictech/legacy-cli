import { NitricBucket } from "@nitric/cli-common";
import { storage } from "@pulumi/azure-nextgen";


/**
 * 
 * @param storageAcct - The Azure storage account to deploy the bucket to
 * @param bucket - The Nitric Bucket description we're deploying
 */
export function createBucket(storageAcct: storage.Account, bucket: NitricBucket): storage.Container {
	return new storage.Container(bucket.name, {
		storageAccountName: storageAcct.name,
	});
}
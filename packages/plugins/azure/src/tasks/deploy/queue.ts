import { NitricQueue } from "@nitric/cli-common";
import { storage, resources } from "@pulumi/azure-nextgen";

export function createQueue(resourceGroup: resources.latest.ResourceGroup, storageAcct: storage.latest.StorageAccount, queue: NitricQueue): storage.latest.Queue {
	return new storage.latest.Queue(queue.name, {
		resourceGroupName: resourceGroup.name,
		accountName: storageAcct.name,
		queueName: queue.name,
	});
}
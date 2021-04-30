import { NitricQueue } from '@nitric/cli-common';
import { storage, resources } from '@pulumi/azure-native';

export function createQueue(
	resourceGroup: resources.ResourceGroup,
	storageAcct: storage.StorageAccount,
	queue: NitricQueue,
): storage.Queue {
	return new storage.Queue(queue.name, {
		resourceGroupName: resourceGroup.name,
		accountName: storageAcct.name,
		queueName: queue.name,
	});
}

import { NitricQueue } from "@nitric/cli-common";
import { storage } from "@pulumi/azure-nextgen";

export function createQueue(storageAcct: storage.Account, queue: NitricQueue): storage.Queue {
	return new storage.Queue(queue.name, {
		name: queue.name,
		storageAccountName: storageAcct.name,
	});
}
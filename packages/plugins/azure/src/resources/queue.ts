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
import { NamedObject, NitricQueue } from '@nitric/cli-common';
import { resources, storage } from '@pulumi/azure-native';

interface NitricStorageQueueArgs {
	queue: NamedObject<NitricQueue>;
	storageAcct: storage.StorageAccount;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure Storage Queue based Queue
 */
export class NitricStorageQueue extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly storagequeue: storage.Queue;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricStorageQueueArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:queue:StorageQueue', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, storageAcct, queue } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.storagequeue = new storage.Queue(
			queue.name,
			{
				resourceGroupName: resourceGroup.name,
				accountName: storageAcct.name,
				queueName: queue.name,
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			storagequeue: this.storagequeue,
			name: this.name,
		});
	}
}

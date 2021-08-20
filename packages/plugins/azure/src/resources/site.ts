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
import path from 'path';
import { crawlDirectorySync, Site } from '@nitric/cli-common';
import { resources, storage } from '@pulumi/azure-native';

interface NitricAzureStorageBucketArgs {
	site: Site;
	storageAcct: storage.StorageAccount;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure Storage based Site
 */
export class NitricAzureStorageSite extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly container: storage.StorageAccountStaticWebsite;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricAzureStorageBucketArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:site:AzureStorage', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, storageAcct, site } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		// TODO: Add additional config for index/error documents
		this.container = new storage.StorageAccountStaticWebsite(
			site.getName(),
			{
				resourceGroupName: resourceGroup.name,
				accountName: storageAcct.name,
				indexDocument: 'index.html',
			},
			defaultResourceOptions,
		);

		// get and upload the assets...
		crawlDirectorySync(path.resolve(site.getAssetPath()), (filePath: string) => {
			// Use path.relative to retrieve keyname for each file
			// This assumes that the asset folder is the root of the bucket
			const relativePath = path.relative(site.getAssetPath(), filePath);
			new storage.Blob(
				relativePath,
				{
					resourceGroupName: this.resourceGroup.name,
					accountName: storageAcct.name,
					containerName: this.container.containerName,
					source: new pulumi.asset.FileAsset(filePath),
				},
				defaultResourceOptions,
			);
		});

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			container: this.container,
			name: this.name,
		});
	}
}

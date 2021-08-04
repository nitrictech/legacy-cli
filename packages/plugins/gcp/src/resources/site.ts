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
import { crawlDirectorySync, Site } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import path from 'path';
import * as mime from 'mime';

interface NitricSiteCloudStorageArgs {
	site: Site;
}

/**
 * Nitric Static Site deployed to Google Cloud Storage
 */
export class NitricSiteCloudStorage extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly storage: gcp.storage.Bucket;

	constructor(name: string, args: NitricSiteCloudStorageArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:site:CloudStorage', name, {}, opts);
		const { site } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = site.getName();

		Site.buildSync(site);

		// Deploy the service
		this.storage = new gcp.storage.Bucket(
			site.getName(),
			{
				labels: {
					'x-nitric-name': site.getName(),
				},
			},
			defaultResourceOptions,
		);

		// Add viewer role for all users to the public bucket
		new gcp.storage.BucketIAMBinding(
			`${site.getName()}publicRule`,
			{
				bucket: this.storage.name,
				members: ['allUsers'],
				role: 'roles/storage.objectViewer',
			},
			defaultResourceOptions,
		);

		crawlDirectorySync(path.resolve(site.getAssetPath()), async (filePath: string) => {
			// Use path.relative to retrieve keyname for each file
			// This assumes that the asset folder is the root of the bucket
			const relativePath = path.relative(site.getAssetPath(), filePath);
			new gcp.storage.BucketObject(
				relativePath,
				{
					//acl: 'public-read',
					name: relativePath,
					bucket: this.storage.name,
					contentType: mime.getType(filePath) || undefined,
					source: new pulumi.asset.FileAsset(filePath),
				},
				defaultResourceOptions,
			);
		});

		this.registerOutputs({
			storage: this.storage,
			name: this.name,
		});
	}
}

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

import { DeployedSite } from '../types';
import { storage } from '@pulumi/gcp';
import { crawlDirectory, Site } from '@nitric/cli-common';
import path from 'path';
import * as mime from 'mime';
import * as pulumi from '@pulumi/pulumi';

/**
 * Create a bucket and upload site files to the bucket
 * @param site to deploy
 */
export async function createSite(site: Site): Promise<DeployedSite> {
	// Build the site if required (This call is NOOP if there are no build scripts)
	await Site.build(site);

	const siteBucket = new storage.Bucket(site.getName(), {
		// uniformBucketLevelAccess: true,
		website: {
			mainPageSuffix: 'index.html',
		},
	});

	// Add viewer role for all users to the public bucket
	new storage.BucketIAMBinding(`${site.getName()}publicRule`, {
		bucket: siteBucket.name,
		members: ['allUsers'],
		role: 'roles/storage.objectViewer',
	});

	await crawlDirectory(path.resolve(site.getAssetPath()), async (filePath: string) => {
		// Use path.relative to retrieve keyname for each file
		// This assumes that the asset folder is the root of the bucket
		const relativePath = path.relative(site.getAssetPath(), filePath);
		new storage.BucketObject(relativePath, {
			//acl: 'public-read',
			//bucket: siteBucket,
			name: relativePath,
			bucket: siteBucket.name,
			contentType: mime.getType(filePath) || undefined,
			source: new pulumi.asset.FileAsset(filePath),
		});
	});

	return {
		name: site.getName(),
		...site.getDescriptor(),
		bucket: siteBucket,
	};
}

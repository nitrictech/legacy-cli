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

import { Site, crawlDirectory } from '@nitric/cli-common';
import { s3 } from '@pulumi/aws';
import { DeployedSite } from '../types';
import * as pulumi from '@pulumi/pulumi';
import path from 'path';
import * as mime from 'mime';

/**
 * Create and upload static site content to a bucket
 */
export async function createSite(site: Site): Promise<DeployedSite> {
	// Build the sites content
	await Site.build(site);

	// Create a Bucket for the static content to reside in
	const siteBucket = new s3.Bucket(site.getName(), {
		acl: 'public-read',
		website: {
			// TODO: Determine if this is necessary for this config.
			indexDocument: 'index.html',
		},
	});

	await crawlDirectory(path.resolve(site.getAssetPath()), async (filePath: string) => {
		// Use path.relative to retrieve keyname for each file
		// This assumes that the asset folder is the root of the bucket
		const relativePath = path.relative(site.getAssetPath(), filePath);
		new s3.BucketObject(relativePath, {
			acl: 'public-read',
			bucket: siteBucket,
			contentType: mime.getType(filePath) || undefined,
			source: new pulumi.asset.FileAsset(filePath),
		});
	});

	return {
		name: site.getName(),
		...site.getDescriptor(),
		s3: siteBucket,
	};
}

import { DeployedSite } from '../types';
import { storage } from '@pulumi/gcp';
import { crawlDirectory, Site } from '@nitric/cli-common';
import path from 'path';
import * as mime from 'mime';
import * as pulumi from '@pulumi/pulumi';

// Create a bucket and upload site files to the bucket
export async function createSite(site: Site): Promise<DeployedSite> {
	// Build the site if required (This call is NOOP of there are not build scripts)
	await Site.build(site);

	const siteBucket = new storage.Bucket(site.getName(), {
		// uniformBucketLevelAccess: true,
		website: {
			mainPageSuffix: 'index.html',
		},
	});

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
		...site.getDescriptor(),
		bucket: siteBucket,
	};
}

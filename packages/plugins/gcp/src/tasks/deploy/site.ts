import { DeployedSite } from '../types';
import { storage } from '@pulumi/gcp';
import fs from 'fs';
import { Site } from '@nitric/cli-common';
import path from 'path';
import * as mime from 'mime';
import * as pulumi from '@pulumi/pulumi';

// An asynchronous directory crawling functionW
// Does not currently handle symlinks and cycles
async function crawlDirectory(dir: string, f: (_: string) => Promise<void>): Promise<void> {
	const files = await fs.promises.readdir(dir);
	for (const file of files) {
		const filePath = `${dir}/${file}`;
		const stat = await fs.promises.stat(filePath);
		if (stat.isDirectory()) {
			await crawlDirectory(filePath, f);
		}
		if (stat.isFile()) {
			await f(filePath);
		}
	}
}

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

	new storage.BucketAccessControl(`${site.getName()}publicRule`, {
		bucket: siteBucket.name,
		role: 'READER',
		entity: 'allUsers',
	});

	//new storage.BucketACL(`${site.getName()}acl`, {
	//	bucket: siteBucket.name,
	//	//predefinedAcl: "publicRead",
	//	roleEntities:[
	//		"READER:allUsers",
	//	]
	//});

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
		...site.getDesciptor(),
		bucket: siteBucket,
	};
}

import { Site } from '@nitric/cli-common';
import { s3 } from '@pulumi/aws';
import fs from 'fs';
import { DeployedSite } from '../types';
import * as pulumi from '@pulumi/pulumi';
import path from 'path';
import * as mime from 'mime';

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
		...site.getDesciptor(),
		s3: siteBucket,
	};
}

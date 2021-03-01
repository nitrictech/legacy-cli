import { NitricStaticSite } from '@nitric/cli-common';
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
export async function createSite(site: NitricStaticSite): Promise<DeployedSite> {
	// Create a Bucket for the static content to reside in

	const siteBucket = new s3.Bucket(site.name, {
		//acl: "public-read",
		website: {
			// Assume this for now
			indexDocument: 'index.html',
		},
	});

	await crawlDirectory(
		path.resolve(site.path),
		async (filePath: string) => {
			// FIXME: Use path.relative?
			const relativePath = path.relative(site.path, filePath);
			new s3.BucketObject(relativePath, {
				//key: relativePath,
				//acl: 'public-read',
				bucket: siteBucket,
				contentType: mime.getType(filePath) || undefined,
				source: new pulumi.asset.FileAsset(filePath),
			});
		},
	);

	return {
		...site,
		s3: siteBucket,
	};
}

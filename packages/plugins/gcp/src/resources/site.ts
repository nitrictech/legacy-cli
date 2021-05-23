import { crawlDirectorySync, Site } from "@nitric/cli-common";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import path from "path";
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
		super("nitric:bucket:CloudStorage", name, {}, opts);
		const { site } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = site.getName();

		Site.buildSync(site)

		// Deploy the service
		this.storage = new gcp.storage.Bucket(site.getName(), {
			labels: {
				'x-nitric-name': site.getName(),
			},
		}, defaultResourceOptions);

		// Add viewer role for all users to the public bucket
		new gcp.storage.BucketIAMBinding(`${site.getName()}publicRule`, {
			bucket: this.storage.name,
			members: ['allUsers'],
			role: 'roles/storage.objectViewer',
		}, defaultResourceOptions);

		crawlDirectorySync(path.resolve(site.getAssetPath()), async (filePath: string) => {
			// Use path.relative to retrieve keyname for each file
			// This assumes that the asset folder is the root of the bucket
			const relativePath = path.relative(site.getAssetPath(), filePath);
			new gcp.storage.BucketObject(relativePath, {
				//acl: 'public-read',
				name: relativePath,
				bucket: this.storage.name,
				contentType: mime.getType(filePath) || undefined,
				source: new pulumi.asset.FileAsset(filePath),
			}, defaultResourceOptions);
		});

		this.registerOutputs({
			storage: this.storage,
			name: this.name,
		});
	}
}
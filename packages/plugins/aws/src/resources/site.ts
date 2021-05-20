import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { crawlDirectorySync, Site } from "@nitric/cli-common";
import path from "path";
import mime from "mime";


interface NitricSiteS3Args {
	site: Site;
	indexDocument: string;
	acl: "public-read" | "private";
};

/**
 * Nitric S3 Bucket based static site
 */
export class NitricSiteS3 extends pulumi.ComponentResource {
	/**
	 * The name of the s3 site
	 */
	public readonly name: string;
	/**
	 * The deployed bucket
	 */
	public readonly s3: aws.s3.Bucket;

	constructor(name, args: NitricSiteS3Args, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:site:S3", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { site, indexDocument, acl } = args;

		// Build the site before proceeding
		Site.buildSync(site);

		this.name = site.getName();

		// Create a Bucket for the static content to reside in
		this.s3 = new aws.s3.Bucket(site.getName(), {
			acl,
			website: {
				indexDocument,
			},
		}, defaultResourceOptions);

		crawlDirectorySync(path.resolve(site.getAssetPath()), (filePath: string) => {
			// Use path.relative to retrieve keyname for each file
			// This assumes that the asset folder is the root of the bucket
			const relativePath = path.relative(site.getAssetPath(), filePath);
			new aws.s3.BucketObject(relativePath, {
				acl: 'public-read',
				bucket: this.s3,
				contentType: mime.getType(filePath) || undefined,
				source: new pulumi.asset.FileAsset(filePath),
			}, defaultResourceOptions);
		});

		this.registerOutputs({
			name: this.name,
			s3: this.s3,
		});
	}
}
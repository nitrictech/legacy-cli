import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { NamedObject, NitricBucket } from "@nitric/cli-common";

interface NitricBucketS3Args {
	bucket: NamedObject<NitricBucket>;
};

/**
 * Nitric S3 Bucket based static site
 */
export class NitricBucketS3 extends pulumi.ComponentResource {
	/**
	 * The name of the s3 site
	 */
	public readonly name: string;
	/**
	 * The deployed bucket
	 */
	public readonly s3: aws.s3.Bucket;

	constructor(name, args: NitricBucketS3Args, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:site:S3", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { bucket } = args;

		this.name = bucket.name;

		// Create a Bucket for the static content to reside in
		this.s3 = new aws.s3.Bucket(bucket.name, {
			tags: {
				'x-nitric-name': bucket.name,
			}
		}, defaultResourceOptions);

		this.registerOutputs({
			name: this.name,
			s3: this.s3,
		});
	}
}
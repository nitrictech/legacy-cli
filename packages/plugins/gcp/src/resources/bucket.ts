import { NamedObject, NitricBucket } from "@nitric/cli-common";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";


interface NitricBucketCloudStorageArgs {
	bucket: NamedObject<NitricBucket>;
}

/**
 * Nitric Service deployed to Google Cloud Run
 */
export class NitricBucketCloudStorage extends pulumi.ComponentResource {

	public readonly storage: gcp.storage.Bucket;

	constructor(name: string, args: NitricBucketCloudStorageArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:bucket:CloudStorage", name, {}, opts);
		const { bucket } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		// Deploy the service
		this.storage = new gcp.storage.Bucket(bucket.name, {
			labels: {
				'x-nitric-name': bucket.name,
			},
		}, defaultResourceOptions);

		this.registerOutputs({
			storage: this.storage,
		});
	}
}
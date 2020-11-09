import { NitricBucket } from '@nitric/cli-common';

import { storage } from '@pulumi/gcp';

export default function (stackName: string, bucket: NitricBucket): { [key: string]: any } {
	let resources: { [key: string]: any } = {};

	resources = {
		...resources,
		[bucket.name]: new storage.Bucket(`${stackName}-${bucket.name}`),
	};

	return resources;
}

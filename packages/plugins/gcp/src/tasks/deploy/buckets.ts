import { NitricBucket } from '@nitric/cli-common';
import { storage } from '@pulumi/gcp';
import { DeployedBucket } from './types';

export function createBucket(bucket: NitricBucket): DeployedBucket {
	const gcloudBucket = new storage.Bucket(bucket.name, {
		// TODO: Determine this configuration
		// storageClass: "MULTI_REGIONAL"
		labels: {
			'x-nitric-name': bucket.name
		}
	});

	return {
		...bucket,
		storage: gcloudBucket
	}
}

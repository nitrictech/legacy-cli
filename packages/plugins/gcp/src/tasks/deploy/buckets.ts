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

export default function (stackName: string, bucket: NitricBucket): any[] {
	let resources = [] as any[];

	resources = [
		{
			type: 'gcp-types/storage-v1:buckets',
			name: `${stackName}-${bucket.name}`,
			// TODO: Define storage classes
			// storageClass: 'STANDARD',
			// TODO: Define storage locations
			// location: 'US',
			// TODO: Define storage projections
			// projection: 'full',
		},
	];

	return resources;
}

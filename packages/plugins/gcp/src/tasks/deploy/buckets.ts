import { NitricBucket } from '@nitric/cli-common';

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

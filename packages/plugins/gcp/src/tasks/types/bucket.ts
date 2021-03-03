import { NitricBucket } from '@nitric/cli-common';
import { storage } from '@pulumi/gcp';

export interface DeployedBucket extends NitricBucket {
	storage: storage.Bucket;
}

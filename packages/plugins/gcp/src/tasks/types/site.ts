import { NitricStaticSite } from '@nitric/cli-common';
import { storage } from '@pulumi/gcp';

export interface DeployedSite extends NitricStaticSite {
	bucket: storage.Bucket;
}

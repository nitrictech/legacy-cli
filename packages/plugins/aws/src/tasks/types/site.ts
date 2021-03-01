import { NitricStaticSite } from "@nitric/cli-common";
import { s3 } from "@pulumi/aws";


export interface DeployedSite extends NitricStaticSite {
	s3: s3.Bucket;
}
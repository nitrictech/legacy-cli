import { NitricAPI } from '@nitric/cli-common';
import { apigateway } from '@pulumi/gcp';

export interface DeployedApi extends NitricAPI {
	// Return the gateway so we can include it in our output
	gateway: apigateway.Gateway;
}
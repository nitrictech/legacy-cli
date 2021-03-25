import { NitricAPI } from '@nitric/cli-common';
import { apigatewayv2 } from '@pulumi/aws';

export interface DeployedAPI extends NitricAPI {
	apiGateway: apigatewayv2.Stage;
}

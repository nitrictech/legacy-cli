import { NitricAPI, NitricAPITarget } from '@nitric/cli-common';
import { apimanagement, resources } from '@pulumi/azure-nextgen';
import { OpenAPIV3 } from 'openapi-types';
import { DeployedFunction } from '../types';
import * as pulumi from '@pulumi/pulumi';

type method = 'get' | 'post' | 'put' | 'update' | 'delete' | 'patch';

const METHODS: method[] = ['get', 'post', 'put', 'update', 'delete', 'patch'];

export function createAPI(
	resourceGroup: resources.latest.ResourceGroup,
	orgName: string,
	adminEmail: string,
	api: NitricAPI,
	functions: DeployedFunction[],
): apimanagement.latest.ApiManagementService {
	// For API deployments, we will want to
	// create a new API service
	// One management service per API for now?
	const service = new apimanagement.latest.ApiManagementService('', {
		resourceGroupName: resourceGroup.name,
		// TODO: Extract from API doc?
		serviceName: `${api.name}-service`,
		publisherEmail: adminEmail,
		publisherName: orgName,
		// TODO: Add cloud prefabs to control this
		sku: {
			capacity: 0,
			name: 'Consumption',
		},
	});

	const { name, ...openapi } = api;

	const azureApi = new apimanagement.latest.Api('api', {
		apiId: name,
		format: 'openapi-json',
		path: '/',
		resourceGroupName: resourceGroup.name,
		serviceName: service.name,
		// XXX: Do we need to stringify this?
		value: JSON.stringify(openapi),
	});

	Object.keys(api.paths).forEach((p) => {
		const path = api.paths[p]!;

		Object.keys(path)
			.filter((k) => METHODS.includes(k as method))
			.forEach((m) => {
				// Get the target from the API and add a policy for it's backed URL

				// Get the nitric target URL

				const pathMethod = path[m] as OpenAPIV3.OperationObject<NitricAPITarget>;
				const func = functions.find((f) => f.name === pathMethod['x-nitric-target'].name);

				if (func) {
					new apimanagement.latest.ApiOperationPolicy('', {
						resourceGroupName: resourceGroup.name,
						apiId: azureApi.id,
						serviceName: service.name,
						// TODO: Need to figure out how this is mapped to a real api operation entity
						operationId: pathMethod.operationId!,
						policyId: pulumi.interpolate`${pathMethod.operationId!}Policy`,
						value: pulumi.interpolate`
						<policies> 
							<inbound /> 
							<backend>    
								<set-backend-service base-url="https://${func.appService.defaultHostName}" />
							</backend>  
							<outbound />
						</policies>
					`,
					});
				}
			});
	});

	return service;
}

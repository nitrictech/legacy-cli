// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as pulumi from '@pulumi/pulumi';
import { NitricAPITarget, StackAPI, constants } from '@nitric/cli-common';
import { resources, apimanagement } from '@pulumi/azure-native';
import { OpenAPIV3 } from 'openapi-types';
import { NitricComputeAzureContainerApp } from '.';

interface NitricApiAzureApiManagementArgs {
	resourceGroup: resources.ResourceGroup;
	orgName: string;
	adminEmail: string;
	api: StackAPI;
	services: NitricComputeAzureContainerApp[];
}

type method = 'get' | 'post' | 'put' | 'update' | 'delete' | 'patch' | 'options';
const METHODS: method[] = ['get', 'post', 'put', 'update', 'delete', 'patch', 'options'];

/**
 * Nitric Azure Api Management based API
 */
export class NitricApiAzureApiManagement extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly service: apimanagement.ApiManagementService;
	public readonly api: apimanagement.Api;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricApiAzureApiManagementArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:api:AzureApiManagement', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, orgName, adminEmail, api, services } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.service = new apimanagement.ApiManagementService(
			name,
			{
				resourceGroupName: resourceGroup.name,
				publisherEmail: adminEmail,
				publisherName: orgName,
				// TODO: Add configuration for this
				sku: {
					capacity: 0,
					name: 'Consumption',
				},
			},
			defaultResourceOptions,
		);

		const openapi = api.document;

		this.api = new apimanagement.Api(
			`${name}-api`,
			{
				displayName: openapi.info?.title || `${name}-api`,
				protocols: ['https'],
				apiId: name,
				format: 'openapi+json',
				path: '/',
				resourceGroupName: resourceGroup.name,
				subscriptionRequired: false,
				serviceName: this.service.name,
				// XXX: Do we need to stringify this?
				// Not need to transform the original spec,
				// the mapping occurs as part of the operation policies below
				value: JSON.stringify(openapi),
			},
			defaultResourceOptions,
		);

		Object.keys(openapi.paths).forEach((p) => {
			const path = openapi.paths[p]!;

			Object.keys(path)
				.filter((k) => METHODS.includes(k as method))
				.forEach((m) => {
					// Get the target from the API and add a policy for it's backed URL

					// Get the nitric target URL
					const pathMethod = path[m] as OpenAPIV3.OperationObject<NitricAPITarget>;

					const func = services.find(
						(f) =>
							pathMethod[constants.OAI_NITRIC_TARGET_EXT] &&
							f.name === pathMethod[constants.OAI_NITRIC_TARGET_EXT].name,
					);

					if (func) {
						new apimanagement.ApiOperationPolicy(
							`${name}-api-${pathMethod.operationId}`,
							{
								resourceGroupName: resourceGroup.name,
								// this.api.id returns a URL path, which is the incorrect value here.
								//   We instead need the value passed to apiId in the api creation above.
								// However, we want to maintain the pulumi dependency, so we need to keep the 'apply' call.
								apiId: this.api.id.apply(() => name),
								serviceName: this.service.name,
								// TODO: Need to figure out how this is mapped to a real api operation entity
								operationId: pathMethod.operationId!,
								// policyId must always be set to the static string 'policy' or Azure returns an error.
								policyId: 'policy',
								format: 'xml',
								value: pulumi.interpolate`
								<policies> 
									<inbound>
										<base />
										<set-backend-service base-url="https://${func.containerApp.latestRevisionFqdn}" />
									</inbound>
									<backend>
										<base />
									</backend>
									<outbound>
										<base />
									</outbound>
									<on-error>
										<base />
									</on-error>
							</policies>
						`,
							},
							defaultResourceOptions,
						);
					}
				});
		});

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			service: this.service,
			api: this.api,
			name: this.name,
		});
	}
}

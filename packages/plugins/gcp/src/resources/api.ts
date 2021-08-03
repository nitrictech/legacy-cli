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
import { NitricAPI, NitricAPITarget } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import { OpenAPIV2 } from 'openapi-types';
import * as gcp from '@pulumi/gcp';
import { NitricServiceCloudRun } from './service';
import Converter from 'api-spec-converter';

interface NitricApiGcpApiGatewayArgs {
	// Preconvert the API spec
	api: OpenAPIV2.Document<NitricAPITarget>;
	services: NitricServiceCloudRun[];
}

type method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const METHOD_KEYS: method[] = ['get', 'post', 'put', 'patch', 'delete'];

interface GoogleExtensions {
	'x-google-backend': {
		address: string;
		path_translation?: 'APPEND_PATH_TO_ADDRESS' | 'CONSTANT_ADDRESS';
	};
}

/**
 * Nitric API deployed to Google Cloud API Gateway
 */
export class NitricApiGcpApiGateway extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly hostname: pulumi.Output<string>;
	public readonly url: pulumi.Output<string>;

	constructor(name: string, args: NitricApiGcpApiGatewayArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:CloudStorage', name, {}, opts);
		const { api, services } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = name;

		// Replace Nitric API Extensions with google api gateway extensions
		const spec = pulumi.all(services.map((s) => s.url.apply((url) => `${s.name}||${url}`))).apply((nameUrlPairs) => {
			const transformedApi = {
				...api,
				// Update the spec paths
				paths: Object.keys(api.paths).reduce((acc, pathKey) => {
					const path: OpenAPIV2.PathItemObject<NitricAPITarget> = api.paths[pathKey]!;

					// Interpolate the new methods
					const newMethods = Object.keys(path)
						.filter((k) => METHOD_KEYS.includes(k as method))
						.reduce((acc, method) => {
							const p = path[method as method]!;

							// The name of the function we want to target with this APIGateway
							const targetName = p['x-nitric-target'].name;

							const invokeUrlPair = nameUrlPairs.find((f) => f.split('||')[0] === targetName);

							if (!invokeUrlPair) {
								throw new Error(`Invalid nitric target ${targetName} defined in api: ${name}`);
							}

							const url = invokeUrlPair.split('||')[1];
							// Discard the old key on the transformed API
							const { 'x-nitric-target': _, ...rest } = p;

							return {
								...acc,
								// Inject the new method with translated nitric target
								[method]: {
									...(rest as OpenAPIV2.OperationObject),
									'x-google-backend': {
										address: url,
										path_translation: 'APPEND_PATH_TO_ADDRESS',
									},
								} as any,
							};
						}, {} as { [key: string]: OpenAPIV2.OperationObject<GoogleExtensions> });

					return {
						...acc,
						[pathKey]: {
							...path,
							...newMethods,
						} as OpenAPIV2.OperationObject<GoogleExtensions>,
					} as any;
				}, {} as OpenAPIV2.PathsObject<GoogleExtensions>),
			};

			// Base64 encode here as well
			return Buffer.from(JSON.stringify(transformedApi)).toString('base64');
		});

		const deployedApi = new gcp.apigateway.Api(
			name,
			{
				apiId: name,
			},
			defaultResourceOptions,
		);

		// Now we need to create the document provided and interpolate the deployed service targets
		// i.e. their Urls...
		// Deploy the config
		const deployedConfig = new gcp.apigateway.ApiConfig(
			`${name}-config`,
			{
				api: deployedApi.apiId,
				displayName: `${name}-config`,
				apiConfigId: `${name}-config`,
				openapiDocuments: [
					{
						document: {
							path: 'openapi.json',
							contents: spec,
						},
					},
				],
			},
			defaultResourceOptions,
		);

		// Deploy the gateway
		const gateway = new gcp.apigateway.Gateway(
			`${name}-gateway`,
			{
				displayName: `${name}-gateway`,
				gatewayId: `${name}-gateway`,
				apiConfig: deployedConfig.id,
			},
			defaultResourceOptions,
		);

		this.hostname = gateway.defaultHostname;
		this.url = gateway.defaultHostname.apply((n) => `https://${n}`);

		this.registerOutputs({
			name: this.name,
			hostname: this.hostname,
			url: this.url,
		});
	}

	/**
	 * Converts a NitricAPI which confroms to OpenAPI v3 spec
	 * to openAPI v2
	 */
	static async convertNitricAPIv2(api: NitricAPI): Promise<OpenAPIV2.Document<NitricAPITarget>> {
		// Convert to swagger, OpenAPI 3 spec isn't supported by GCP API Gateway currently.
		const { spec: translatedApi }: { spec: OpenAPIV2.Document<NitricAPITarget> } = await Converter.convert({
			from: 'openapi_3',
			to: 'swagger_2',
			source: api,
		});

		return translatedApi;
	}
}

// Copyright 2021, Nitric Pty Ltd.
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
import { DeployedApi, DeployedFunction } from '../types';
import { OpenAPIV2 } from 'openapi-types';
import Converter from 'api-spec-converter';
import { apigateway } from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

type method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const METHOD_KEYS: method[] = ['get', 'post', 'put', 'patch', 'delete'];

interface GoogleExtensions {
	'x-google-backend': {
		address: string;
	};
}

async function transformOpenApiSpec(api: NitricAPI, funcs: DeployedFunction[]): Promise<pulumi.Output<string>> {
	const { name, ...spec } = api;

	// Convert to swagger
	const { spec: translatedApi }: { spec: OpenAPIV2.Document<NitricAPITarget> } = await Converter.convert({
		from: 'openapi_3',
		to: 'swagger_2',
		source: spec,
	});

	// Transform the spec and base64 encode
	const transformedDoc = pulumi
		.all(funcs.map((f) => f.cloudRun.statuses.apply(([s]) => `${f.name}||${s.url}`)))
		.apply((nameUrlPairs) => {
			const transformedApi = {
				...translatedApi,
				// Update the spec paths
				paths: Object.keys(translatedApi.paths).reduce((acc, pathKey) => {
					const path: OpenAPIV2.PathItemObject<NitricAPITarget> = translatedApi.paths[pathKey]!;

					// Interpolate the new methods
					const newMethods = Object.keys(path)
						.filter((k) => METHOD_KEYS.includes(k as method))
						.reduce((acc, method) => {
							const p = path[method as method]!;

							// The name of the function we want to target with this APIGateway
							const targetName = p['x-nitric-target'].name;

							const invokeUrlPair = nameUrlPairs.find((f) => f.split('||')[0] === targetName);

							if (!invokeUrlPair) {
								throw new Error(`Invalid nitric target ${targetName} defined in api: ${api.name}`);
							}

							const url = invokeUrlPair.split('||')[1];
							// Discard the old key on the transformed API
							const { 'x-nitric-target': _, ...rest } = p;

							// console.log("invokeArn:", invokeArn);

							return {
								...acc,
								// Inject the new method with translated nitric target
								[method]: {
									...(rest as OpenAPIV2.OperationObject),
									'x-google-backend': {
										address: url,
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

	return transformedDoc;
}

export async function createApi(api: NitricAPI, funcs: DeployedFunction[]): Promise<DeployedApi> {
	const b64Spec = await transformOpenApiSpec(api, funcs);

	// Deploy the API
	const deployedApi = new apigateway.Api(api.name, {
		apiId: api.name,
	});

	// Now we need to create the document provided and interpolate the deployed function targets
	// i.e. their Urls...
	// Deploy the config
	const deployedConfig = new apigateway.ApiConfig(`${api.name}-config`, {
		api: deployedApi.apiId,
		displayName: `${api.name}-config`,
		apiConfigId: `${api.name}-config`,
		openapiDocuments: [
			{
				document: {
					path: 'openapi.json',
					contents: b64Spec,
				},
			},
		],
	});

	// Deploy the gateway
	const deployedGateway = new apigateway.Gateway(`${api.name}-gateway`, {
		displayName: `${api.name}-gateway`,
		gatewayId: `${api.name}-gateway`,
		apiConfig: deployedConfig.id,
	});

	return {
		...api,
		gateway: deployedGateway,
	};
}

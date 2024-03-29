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
import { NitricAPITarget, StackAPIDocument, constants } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import { OpenAPIV2 } from 'openapi-types';
import * as gcp from '@pulumi/gcp';
import { NitricComputeCloudRun } from './compute';
import Converter from 'api-spec-converter';

interface NitricApiGcpApiGatewayArgs {
	// Preconvert the API spec
	api: OpenAPIV2.Document<NitricAPITarget>;
	services: NitricComputeCloudRun[];
}

type method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options';

const METHOD_KEYS: method[] = ['get', 'post', 'put', 'patch', 'delete', 'options'];

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

	public readonly api: gcp.apigateway.Api;
	public readonly config: gcp.apigateway.ApiConfig;
	public readonly gateway: gcp.apigateway.Gateway;
	public readonly invoker: gcp.serviceaccount.Account;
	public readonly memberships: gcp.cloudrun.IamMember[];

	constructor(name: string, args: NitricApiGcpApiGatewayArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:api:GcpApiGateway', name, {}, opts);
		const { api, services } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = name;

		// Get service targets for IAM binding
		const targetServices = Object.keys(api.paths).reduce((svcs, path) => {
			const p = api.paths[path] as OpenAPIV2.PathItemObject<NitricAPITarget>;

			const s = Object.keys(p)
				.filter((k) => METHOD_KEYS.includes(k as method))
				.reduce((acc, method) => {
					const pathTarget = p[method as method]?.[constants.OAI_NITRIC_TARGET_EXT];
					const svc = services.find(({ name }) => name === pathTarget?.name);

					if (svc && !acc.includes(svc)) {
						acc.push(svc);
					}

					return acc;
				}, svcs);

			return s;
		}, [] as NitricComputeCloudRun[]);

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
							if (p[constants.OAI_NITRIC_TARGET_EXT]) {
								const targetName = p[constants.OAI_NITRIC_TARGET_EXT].name;

								const invokeUrlPair = nameUrlPairs.find((f) => f.split('||')[0] === targetName);

								if (!invokeUrlPair) {
									throw new Error(`Invalid nitric target ${targetName} defined in api: ${name}`);
								}

								const url = invokeUrlPair.split('||')[1];
								// Discard the old key on the transformed API
								const { [constants.OAI_NITRIC_TARGET_EXT]: _, ...rest } = p;

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
							}

							return {
								...acc,
								[method]: p,
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

		this.api = new gcp.apigateway.Api(
			name,
			{
				apiId: name,
			},
			defaultResourceOptions,
		);

		// Create a new IAM account for invoking
		this.invoker = new gcp.serviceaccount.Account(
			`${name}-acct`,
			{
				// Limit to 30 characters for service account name
				// as hard constraint in GCP
				accountId: `${name}-acct`.substr(0, 30),
			},
			defaultResourceOptions,
		);

		// Bind that IAM account as a member of all available service targets
		this.memberships = targetServices.map((svc) => {
			return new gcp.cloudrun.IamMember(
				`${name}-${svc.name}-binding`,
				{
					service: svc.cloudrun.name,
					location: svc.cloudrun.location,
					member: pulumi.interpolate`serviceAccount:${this.invoker.email}`,
					role: 'roles/run.invoker',
				},
				defaultResourceOptions,
			);
		});

		// Now we need to create the document provided and interpolate the deployed service targets
		// i.e. their Urls...
		// Deploy the config
		this.config = new gcp.apigateway.ApiConfig(
			`${name}-config`,
			{
				api: this.api.apiId,
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
				gatewayConfig: {
					backendConfig: {
						// Add the service account for the invoker here...
						googleServiceAccount: this.invoker.email,
					},
				},
			},
			defaultResourceOptions,
		);

		// Deploy the gateway
		this.gateway = new gcp.apigateway.Gateway(
			`${name}-gateway`,
			{
				displayName: `${name}-gateway`,
				gatewayId: `${name}-gateway`,
				apiConfig: this.config.id,
			},
			defaultResourceOptions,
		);

		this.hostname = this.gateway.defaultHostname;
		this.url = this.gateway.defaultHostname.apply((n) => `https://${n}`);

		this.registerOutputs({
			name: this.name,
			hostname: this.hostname,
			url: this.url,
			api: this.api,
			invoker: this.invoker,
			memberships: this.memberships,
			config: this.config,
			gateway: this.gateway,
		});
	}

	/**
	 * Converts a NitricAPI which confroms to OpenAPI v3 spec
	 * to openAPI v2
	 */
	static async convertNitricAPIv2(api: StackAPIDocument): Promise<OpenAPIV2.Document<NitricAPITarget>> {
		// Convert to swagger, OpenAPI 3 spec isn't supported by GCP API Gateway currently.
		const { spec: translatedApi }: { spec: OpenAPIV2.Document<NitricAPITarget> } = await Converter.convert({
			from: 'openapi_3',
			to: 'swagger_2',
			source: api,
		});

		return translatedApi;
	}
}

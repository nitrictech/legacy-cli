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
import * as aws from '@pulumi/aws';
import { OpenAPIV3 } from 'openapi-types';
import { uniq } from 'lodash';
import { StackAPI } from '@nitric/cli-common';
import { NitricComputeAWSLambda } from './compute';

type method = 'get' | 'post' | 'put' | 'patch' | 'delete';
const METHOD_KEYS: method[] = ['get', 'post', 'put', 'patch', 'delete'];

type AwsApiGatewayIntegrationType = 'http' | 'http_proxy' | 'aws' | 'aws_proxy' | 'mock';
type AwsApiGatewayHttpMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Basic type definitions for AWS OpenAPI extensions
// https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
interface AwsExtentions {
	'x-amazon-apigateway-integration': {
		uri: string | Record<string, unknown>;
		responses?: any;
		passthroughBehaviour?: string;
		httpMethod: AwsApiGatewayHttpMethods;
		timeoutInMillis?: number;
		contentHandling?: string;
		type: AwsApiGatewayIntegrationType;
	};
}

interface NitricApiAwsApiGatewayArgs {
	api: StackAPI;
	// TODO: Create more abstract func type here...
	lambdas: NitricComputeAWSLambda[];
}

/**
 *
 */
export class NitricApiAwsApiGateway extends pulumi.ComponentResource {
	/**
	 * The APIs nitric name
	 */
	public readonly name: string;

	/**
	 * The deployed API
	 */
	public readonly api: aws.apigatewayv2.Api;

	constructor(name, args: NitricApiAwsApiGatewayArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:api:AwsApiGateway', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { api, lambdas } = args;

		this.name = name;

		const openapi = api.document;

		const targetNames = uniq(
			Object.keys(openapi.paths).reduce((acc, p) => {
				const path = openapi.paths[p]!;

				return [
					...acc,
					...Object.keys(path)
						.filter((k) => METHOD_KEYS.includes(k as method) && path[k]['x-nitric-target'])
						.map((m) => {
							const method = path[m as method]!;
							return method['x-nitric-target'].name;
						}),
				];
			}, [] as string[]),
		);

		const transformedDoc = pulumi
			.all(lambdas.map((s) => s.lambda.invokeArn.apply((arn) => `${s.name}||${arn}`)))
			.apply((nameArnPairs) => {
				const transformedApi = {
					...openapi,
					paths: Object.keys(openapi.paths).reduce((acc, pathKey) => {
						const path = openapi.paths[pathKey]!;
						const newMethods = Object.keys(path)
							.filter((k) => METHOD_KEYS.includes(k as method))
							.reduce((acc, method) => {
								const p = path[method];

								// The name of the function we want to target with this APIGateway

								if (p['x-nitric-name']) {
									const targetName = p['x-nitric-target'].name;

									const invokeArnPair = nameArnPairs.find((f) => f.split('||')[0] === targetName);

									if (!invokeArnPair) {
										throw new Error(`Invalid nitric target ${targetName} defined in api: ${api.name}`);
									}

									const invokeArn = invokeArnPair.split('||')[1];
									// Discard the old key on the transformed API
									const { 'x-nitric-target': _, ...rest } = p;

									return {
										...acc,
										[method]: {
											...(rest as OpenAPIV3.OperationObject),
											'x-amazon-apigateway-integration': {
												type: 'aws_proxy',
												httpMethod: 'POST',
												payloadFormatVersion: '2.0',
												// TODO: This might cause some trouble
												// Need to determine if the body of the
												uri: invokeArn,
											},
										} as any, // OpenAPIV3.OperationObject<AwsExtentions>
									};
								}

								// return method without re-write if x-nitric-target not specified
								return {
									...acc,
									[method]: p,
								};
							}, {} as { [key: string]: OpenAPIV3.OperationObject<AwsExtentions> });

						return {
							...acc,
							[pathKey]: {
								...path,
								...newMethods,
							} as OpenAPIV3.OperationObject<AwsExtentions>,
						} as any;
					}, {} as OpenAPIV3.PathsObject<AwsExtentions>),
				};

				return JSON.stringify(transformedApi);
			});

		this.api = new aws.apigatewayv2.Api(
			api.name,
			{
				body: transformedDoc,
				protocolType: 'HTTP',
			},
			defaultResourceOptions,
		);

		// stage
		new aws.apigatewayv2.Stage(
			`${api.name}DefaultStage`,
			{
				apiId: this.api.id,
				name: '$default',
				autoDeploy: true,
			},
			defaultResourceOptions,
		);

		// Generate lambda permissions enabling the API Gateway to invoke the functions it targets
		lambdas
			.filter((f) => targetNames.includes(f.name))
			.forEach((f) => {
				new aws.lambda.Permission(
					`${f.name}APIPermission`,
					{
						action: 'lambda:InvokeFunction',
						function: f.lambda,
						principal: 'apigateway.amazonaws.com',
						sourceArn: pulumi.interpolate`${this.api.executionArn}/*/*/*`,
					},
					defaultResourceOptions,
				);
			});

		this.registerOutputs({
			name: this.name,
			api: this.api,
		});
	}
}

import { NitricAPI } from '@nitric/cli-common';
import { OpenAPIV3 } from 'openapi-types';
import { uniq } from 'lodash';
import { DeployedAPI, DeployedFunction } from '../types';
import { apigatewayv2, lambda } from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import fs from 'fs';

type method = 'get' | 'post' | 'put' | 'patch' | 'delete';
const METHOD_KEYS: method[] = ['get', 'post', 'put', 'patch', 'delete'];

type AwsApiGatewayIntegrationType = 'http' | 'http_proxy' | 'aws' | 'aws_proxy' | 'mock';
type AwsApiGatewayHttpMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Basic type definitions for AWS OpenAPI extensions
// https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
interface AwsExtentions {
	'x-amazon-apigateway-integration': {
		uri: string | object;
		responses?: any;
		passthroughBehaviour?: string;
		httpMethod: AwsApiGatewayHttpMethods;
		timeoutInMillis?: number;
		contentHandling?: string;
		type: AwsApiGatewayIntegrationType;
	};
}

export function createApi(api: NitricAPI, funcs: DeployedFunction[]): DeployedAPI {
	const { name, ...rest } = api;

	const targetNames = uniq(
		Object.keys(api.paths).reduce((acc, p) => {
			const path = api.paths[p]!;

			return [
				...acc,
				...Object.keys(path)
					.filter((k) => METHOD_KEYS.includes(k as method))
					.map((m) => {
						const method = path[m as method]!;
						return method['x-nitric-target'].name;
					}),
			];
		}, [] as string[]),
	);

	fs.writeFileSync('garbagefile.json', JSON.stringify(targetNames));

	const transformedDoc = pulumi
		.all(funcs.map((f) => f.awsLambda.invokeArn.apply((arn) => `${f.name}||${arn}`)))
		.apply((nameArnPairs) => {
			const transformedApi = {
				...rest,
				paths: Object.keys(api.paths).reduce((acc, pathKey) => {
					const path = api.paths[pathKey]!;
					const newMethods = Object.keys(path)
						.filter((k) => METHOD_KEYS.includes(k as method))
						.reduce((acc, method) => {
							const p = path[method];

							// The name of the function we want to target with this APIGateway
							const targetName = p['x-nitric-target'].name;

							const invokeArnPair = nameArnPairs.find((f) => f.split('||')[0] === targetName);

							if (!invokeArnPair) {
								throw new Error(`Invalid nitric target ${targetName} defined in api: ${api.name}`);
							}

							const invokeArn = invokeArnPair.split('||')[1];
							// Discard the old key on the transformed API
							const { 'x-nitric-target': _, ...rest } = p;

							// console.log("invokeArn:", invokeArn);

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

	const deployedApi = new apigatewayv2.Api(api.name, {
		body: transformedDoc,
		protocolType: 'HTTP',
	});

	// stage
	const stage = new apigatewayv2.Stage(`${api.name}DefaultStage`, {
		apiId: deployedApi.id,
		name: '$default',
		autoDeploy: true,
	});

	// generate lambda permissions
	funcs
		.filter((f) => targetNames.includes(f.name))
		.forEach((f) => {
			new lambda.Permission(`${f.name}APIPermission`, {
				action: 'lambda:InvokeFunction',
				function: f.awsLambda,
				principal: 'apigateway.amazonaws.com',
				sourceArn: pulumi.interpolate`${deployedApi.executionArn}/*/*/*`,
			});
		});

	return {
		...api,
		apiGateway: stage,
	}
}

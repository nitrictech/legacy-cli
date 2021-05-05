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

import { cloudfront, types, apigatewayv2, lambda } from '@pulumi/aws';
import { NitricEntrypoints } from '@nitric/cli-common';
import { DeployedAPI, DeployedService, DeployedSite } from '../types';
import * as pulumi from '@pulumi/pulumi';
import YAML from 'yaml';

function createApiGatewayForFunction(deployedService: DeployedService): apigatewayv2.Stage {
	// Grant apigateway permission to execute the lambda
	const body = deployedService.awsLambda.invokeArn.apply((invokeArn) =>
		YAML.stringify({
			openapi: '3.0.1',
			info: {
				version: '1.0',
				title: `${deployedService.name}Proxy`,
			},
			paths: {
				$default: {
					'x-amazon-apigateway-any-method': {
						'x-amazon-apigateway-integration': {
							type: 'aws_proxy',
							httpMethod: 'POST',
							payloadFormatVersion: '2.0',
							uri: invokeArn,
						},
						isDefaultRoute: true,
						responses: {},
					},
				},
			},
		}),
	);

	// Create the lambda proxy API for invocation via cloudfront
	const lambdaAPI = new apigatewayv2.Api(`${deployedService.name}ProxyApi`, {
		body,
		protocolType: 'HTTP',
	});

	// Create a deployment for this API
	const deployment = new apigatewayv2.Stage(`${deployedService.name}ProxyDeployment`, {
		apiId: lambdaAPI.id,
		name: '$default',
		autoDeploy: true,
	});

	new lambda.Permission(`${deployedService.name}ProxyPermission`, {
		action: 'lambda:InvokeFunction',
		function: deployedService.awsLambda,
		principal: 'apigateway.amazonaws.com',
		sourceArn: pulumi.interpolate`${lambdaAPI.executionArn}/*/*`,
	});

	return deployment;
}

function originsFromEntrypoints(
	oai: cloudfront.OriginAccessIdentity,
	entrypoints: NitricEntrypoints,
	deployedSites: DeployedSite[],
	deployedApis: DeployedAPI[],
	deployedServices: DeployedService[],
): types.input.cloudfront.DistributionOrigin[] {
	return Object.keys(entrypoints).map((key) => {
		const { type, name } = entrypoints[key];

		switch (type) {
			case 'api': {
				// Search out deployed APIs for the name
				const deployedApi = deployedApis.find((a) => a.name === name);

				if (!deployedApi) {
					throw new Error(`Target API ${name} configured in entrypoints but does not exist`);
				}

				const domainName = deployedApi.apiGateway.invokeUrl.apply((url) => new URL(url).host);

				return {
					domainName,
					originId: deployedApi.name,
					customOriginConfig: {
						httpPort: 80,
						httpsPort: 443,
						originProtocolPolicy: 'https-only',
						originSslProtocols: ['TLSv1.2', 'SSLv3'],
					},
				};
			}
			case 'site': {
				const deployedSite = deployedSites.find((s) => s.name === name);

				if (!deployedSite) {
					throw new Error(`Target Site ${name} configured in entrypoints but does not exist`);
				}

				// Search our deployed sites for the name
				return {
					domainName: deployedSite.s3.bucketRegionalDomainName,
					originId: deployedSite.name,
					s3OriginConfig: {
						originAccessIdentity: oai.cloudfrontAccessIdentityPath,
					},
				};
			}
			case 'service': {
				const deployedService = deployedServices.find((s) => s.name === name);

				if (!deployedService) {
					throw new Error(`Target Function ${name} configured in entrypoints but does not exist`);
				}

				const apiGateway = createApiGatewayForFunction(deployedService);

				// Then we extract the domain name from the created api gateway...
				const domainName = apiGateway.invokeUrl.apply((url) => new URL(url).host);

				//// Craft and API origin here...
				return {
					domainName,
					originId: deployedService.name,
					customOriginConfig: {
						httpPort: 80,
						httpsPort: 443,
						originProtocolPolicy: 'https-only',
						originSslProtocols: ['TLSv1.2', 'SSLv3'],
					},
				};
			}
			default: {
				throw new Error(`Invalid entrypoint type:${type} defined`);
			}
		}
	});
}

function entrypointsToBehaviours(
	entrypoints: NitricEntrypoints,
): {
	defaultCacheBehavior: types.input.cloudfront.DistributionDefaultCacheBehavior;
	orderedCacheBehaviors: types.input.cloudfront.DistributionOrderedCacheBehavior[];
} {
	const defaultEntrypoint = entrypoints['/'];
	const otherEntrypoints = Object.keys(entrypoints)
		.filter((k) => k !== '/')
		.map((k) => ({
			...entrypoints[k],
			path: k,
		}));

	return {
		defaultCacheBehavior: {
			allowedMethods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
			cachedMethods: ['GET', 'HEAD'],
			targetOriginId: defaultEntrypoint.name,
			forwardedValues: {
				queryString: true,
				cookies: {
					forward: 'all',
				},
			},
			viewerProtocolPolicy: 'https-only',
		},
		orderedCacheBehaviors: otherEntrypoints.map((e) => ({
			pathPattern: `${e.path}*`,
			allowedMethods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
			cachedMethods: ['GET', 'HEAD'],
			targetOriginId: e.name,
			forwardedValues: {
				queryString: true,
				cookies: {
					forward: 'all',
				},
			},
			viewerProtocolPolicy: 'redirect-to-https',
		})),
	};
}

/**
 * Creates a front-end for nitric applicaiton ingress
 * This includes single origin presentation for
 * Static-sites & APIs
 */
export async function createEntrypoints(
	stackName: string,
	entrypoints: NitricEntrypoints,
	deployedSites: DeployedSite[],
	deployedApis: DeployedAPI[],
	deployedServices: DeployedService[],
): Promise<cloudfront.Distribution> {
	const defaultEntrypoint = entrypoints['/'];

	if (!defaultEntrypoint) {
		throw new Error(
			'No default route specified (path /) please specify a default route in your application entrypoints',
		);
	}

	const oai = new cloudfront.OriginAccessIdentity(`${stackName}OAI`);
	const origins = originsFromEntrypoints(oai, entrypoints, deployedSites, deployedApis, deployedServices);
	const { defaultCacheBehavior, orderedCacheBehaviors } = entrypointsToBehaviours(entrypoints);

	// Create a new cloudfront distribution
	return new cloudfront.Distribution(`${stackName}Distribution`, {
		enabled: true,
		// Assume for now default will be index
		// TODO: Make this configurable via nitric.yaml
		defaultRootObject: 'index.html',
		defaultCacheBehavior,
		orderedCacheBehaviors,
		origins,
		viewerCertificate: {
			cloudfrontDefaultCertificate: true,
		},
		// TODO: Determine price class
		priceClass: 'PriceClass_All',
		restrictions: {
			geoRestriction: {
				restrictionType: 'whitelist',
				locations: ['AU'],
			},
		},
	});
}

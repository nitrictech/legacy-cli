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
import { NitricEntrypoint } from '@nitric/cli-common';
import { NitricSiteS3 } from './site';
import { NitricApiAwsApiGateway } from './api';
import { NitricComputeAWSLambda } from './compute';

interface NitricEntrypointCloudfrontArgs {
	stackName: string;
	entrypoint: NitricEntrypoint;
	sites: NitricSiteS3[];
	apis: NitricApiAwsApiGateway[];
	lambdas: NitricComputeAWSLambda[];
}

/**
 * Nitric CloudFront based entrypoint
 */
export class NitricEntrypointCloudFront extends pulumi.ComponentResource {
	/**
	 * The deployed distribution
	 */
	public readonly cloudfront: aws.cloudfront.Distribution;
	public readonly name: string;
	public readonly domains?: string[];
	// public readonly validationOptions?: pulumi.Output<aws.types.output.acm.CertificateDomainValidationOption[]>;

	constructor(name, args: NitricEntrypointCloudfrontArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:entrypoints:CloudFront', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { entrypoint, stackName, sites, apis, lambdas } = args;
		const oai = new aws.cloudfront.OriginAccessIdentity(`${stackName}OAI`, {}, defaultResourceOptions);

		this.name = name;
		this.domains = entrypoint.domains;

		// Create the origins
		const origins = Object.keys(entrypoint.paths).map((key) => {
			const { type, target } = entrypoint.paths[key];

			switch (type) {
				case 'api': {
					// Search deployed APIs for the name
					const deployedApi = apis.find((a) => a.name === target);

					if (!deployedApi) {
						throw new Error(`Target API ${name} configured in entrypoints but does not exist`);
					}

					const domainName = deployedApi.api.apiEndpoint.apply((url) => new URL(url).host);

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
					const deployedSite = sites.find((s) => s.name === target);

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
					const deployedService = lambdas.find((s) => s.name === target);

					if (!deployedService) {
						throw new Error(`Target Function ${name} configured in entrypoints but does not exist`);
					}

					const apiGateway = new aws.apigatewayv2.Api(
						`${deployedService.name}ProxyApi`,
						{
							target: deployedService.lambda.arn,
							protocolType: 'HTTP',
						},
						defaultResourceOptions,
					);

					new aws.lambda.Permission(
						`${deployedService.name}ProxyPermission`,
						{
							action: 'lambda:InvokeFunction',
							function: deployedService.lambda,
							principal: 'apigateway.amazonaws.com',
							sourceArn: pulumi.interpolate`${apiGateway.executionArn}/*/*`,
						},
						defaultResourceOptions,
					);

					// Then we extract the domain name from the created api gateway...
					const domainName = apiGateway.apiEndpoint.apply((url) => new URL(url).host);

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

		const { defaultCacheBehavior, orderedCacheBehaviors } =
			NitricEntrypointCloudFront.entrypointsToBehaviours(entrypoint);

		let viewerCertificate: aws.types.input.cloudfront.DistributionViewerCertificate = {
			cloudfrontDefaultCertificate: true,
		};
		let aliases: string[] | undefined = undefined;

		// Customize domains and view certificate for frontend
		if (entrypoint.domains && entrypoint.domains.length > 0) {
			// Deploy a viewer certificate to ACM for this domain
			// we'll use DNS validation for maximum flexiblity and notify the user of the cname record they need
			// to update their DNS that manages their domain...
			// For now we'll have to document that all additional SANs MUST be present in the issued certificate
			const [domain] = entrypoint.domains;

			// Here we will import the user provided certificate
			const issuedCertificate = pulumi.output(
				aws.acm.getCertificate({
					domain: domain,
					mostRecent: true,
					statuses: ['ISSUED'],
				}),
			);

			// Single cert for the distribution
			//const cert = new aws.acm.Certificate(`${name}Certificate`, {
			//	domainName,
			//	subjectAlternativeNames,
			//	validationMethod: "DNS",
			//}, defaultResourceOptions);

			//// XXX: This will actually halt the provisioning of the domain
			//// until the certificate is valid
			//const certValidation = new aws.acm.CertificateValidation(`${name}CertificateValidation`, {
			//	certificateArn: cert.arn,
			//}, defaultResourceOptions);

			//// Need to map these validation options in order to let the user know they need to do this...
			//this.validationOptions = cert.domainValidationOptions;

			viewerCertificate = {
				// It's important to use the cert validation property here...
				acmCertificateArn: issuedCertificate.arn,
				sslSupportMethod: 'sni-only',
			};

			aliases = entrypoint.domains;
		}

		// Create a new cloudfront distribution
		this.cloudfront = new aws.cloudfront.Distribution(
			`${name}Distribution`,
			{
				enabled: true,
				aliases,
				// Assume for now default will be index
				// TODO: Make this configurable via nitric.yaml
				// defaultRootObject: '/',
				defaultCacheBehavior,
				orderedCacheBehaviors,
				origins,
				// TODO: Make viewer cert configurable
				viewerCertificate,
				// TODO: Determine price class
				priceClass: 'PriceClass_All',
				// TODO: Make this configurable through entrypoints extensions
				restrictions: {
					geoRestriction: {
						restrictionType: 'none',
					},
				},
			},
			defaultResourceOptions,
		);

		this.registerOutputs({
			// validationOptions: this.validationOptions,
			name: this.name,
			domains: this.domains,
			cloudfront: this.cloudfront,
		});
	}

	static entrypointsToBehaviours(entrypoints: NitricEntrypoint): {
		defaultCacheBehavior: aws.types.input.cloudfront.DistributionDefaultCacheBehavior;
		orderedCacheBehaviors: aws.types.input.cloudfront.DistributionOrderedCacheBehavior[];
	} {
		const defaultEntrypoint = entrypoints.paths['/'];
		const otherEntrypoints = Object.keys(entrypoints.paths)
			.filter((k) => k !== '/')
			.map((k) => ({
				...entrypoints.paths[k],
				path: k,
			}));

		return {
			defaultCacheBehavior: {
				allowedMethods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
				cachedMethods: ['GET', 'HEAD'],
				targetOriginId: defaultEntrypoint.target,
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
				targetOriginId: e.target,
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
}

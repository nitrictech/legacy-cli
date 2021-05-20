import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { NitricEntrypoints } from "@nitric/cli-common";
import { NitricSiteS3 } from "./site";
import { NitricApiAwsApiGateway } from "./api";
import { NitricServiceAWSLambda } from "./service";

interface NitricEntrypointCloudfrontArgs {
	stackName: string;
	entrypoints: NitricEntrypoints;
	sites: NitricSiteS3[];
	apis: NitricApiAwsApiGateway[];
	services: NitricServiceAWSLambda[];
};

/**
 * Nitric S3 Bucket based static site
 */
export class NitricEntrypointCloudFront extends pulumi.ComponentResource {
	/**
	 * The deployed bucket
	 */
	public readonly cloudfront: aws.cloudfront.Distribution;

	constructor(name, args: NitricEntrypointCloudfrontArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:entrypoints:CloudFront", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { entrypoints, stackName, sites, apis, services } = args;
		const oai = new aws.cloudfront.OriginAccessIdentity(
			`${stackName}OAI`, {}, 
			defaultResourceOptions);

		// Create the origins
		const origins = Object.keys(entrypoints).map((key) => {
			const { type, name } = entrypoints[key];

			switch (type) {
				case 'api': {
					// Search deployed APIs for the name
					const deployedApi = apis.find((a) => a.name === name);

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
					const deployedSite = sites.find((s) => s.name === name);

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
					const deployedService = services.find((s) => s.name === name);

					if (!deployedService) {
						throw new Error(`Target Function ${name} configured in entrypoints but does not exist`);
					}

					const apiGateway = new aws.apigatewayv2.Api(`${deployedService.name}ProxyApi`, {
						target: deployedService.lambda.arn,
						protocolType: "HTTP"
					}, defaultResourceOptions);
				
					new aws.lambda.Permission(`${deployedService.name}ProxyPermission`, {
						action: 'lambda:InvokeFunction',
						function: deployedService.lambda,
						principal: 'apigateway.amazonaws.com',
						sourceArn: pulumi.interpolate`${apiGateway.executionArn}/*/*`,
					}, defaultResourceOptions);

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

		const { defaultCacheBehavior, orderedCacheBehaviors } = NitricEntrypointCloudFront.entrypointsToBehaviours(entrypoints);
		// Create a new cloudfront distribution
		this.cloudfront = new aws.cloudfront.Distribution(`${stackName}Distribution`, {
			enabled: true,
			// Assume for now default will be index
			// TODO: Make this configurable via nitric.yaml
			// defaultRootObject: '/',
			defaultCacheBehavior,
			orderedCacheBehaviors,
			origins,
			// TODO: Make viewer cert configurable
			viewerCertificate: {
				cloudfrontDefaultCertificate: true,
			},
			// TODO: Determine price class
			priceClass: 'PriceClass_All',
			// TODO: Make this configurable through entrypoints extensions
			restrictions: {
				geoRestriction: {
					restrictionType: 'none',
				}
			},
		}, defaultResourceOptions);

		this.registerOutputs({
			cloudfront: this.cloudfront,
		});
	}

	static entrypointsToBehaviours(
		entrypoints: NitricEntrypoints
	): {
		defaultCacheBehavior: aws.types.input.cloudfront.DistributionDefaultCacheBehavior;
		orderedCacheBehaviors: aws.types.input.cloudfront.DistributionOrderedCacheBehavior[];
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
}
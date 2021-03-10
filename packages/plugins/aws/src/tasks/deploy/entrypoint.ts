import { cloudfront, types } from '@pulumi/aws';
import { NitricEntrypoints } from '@nitric/cli-common';
import { DeployedAPI, DeployedSite } from '../types';

function originsFromEntrypoints(
	oai: cloudfront.OriginAccessIdentity,
	entrypoints: NitricEntrypoints,
	deployedSites: DeployedSite[],
	deployedApis: DeployedAPI[],
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

				// Craft and API origin here...
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
export async function createEntrypoint(
	stackName: string,
	entrypoints: NitricEntrypoints,
	deployedSites: DeployedSite[],
	deployedApis: DeployedAPI[],
): Promise<cloudfront.Distribution> {
	const defaultEntrypoint = entrypoints['/'];

	if (!defaultEntrypoint) {
		throw new Error(
			'No default route specified (path /) please specify a default route in your application entrypoints',
		);
	}

	const oai = new cloudfront.OriginAccessIdentity(`${stackName}OAI`);
	const origins = originsFromEntrypoints(oai, entrypoints, deployedSites, deployedApis);
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

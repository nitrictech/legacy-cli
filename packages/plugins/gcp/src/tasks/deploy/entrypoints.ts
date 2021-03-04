import { NitricEntrypoints } from '@nitric/cli-common';
import { compute } from '@pulumi/gcp';
import { DeployedApi, DeployedSite } from '../types';
import * as pulumi from '@pulumi/pulumi';
import * as tls from '@pulumi/tls';
import fs from 'fs';

type Backend = compute.BackendBucket | compute.BackendService;

type BackendItem = {
	backend: Backend;
	name: string;
};

// Loop over entrypoint keys and for each
// 1: Identify it's type (api/site(bucket))
// 2: Create its backend service (internet NEG for API and BucketService for site)
// 3: Create and attach it's endpoint If necessary (i.e. internet FQDN for API)
// 4: Create URL Map for routing (use entrpoint key -> target from previous step)
// 5: Create the frontend (External HTTPS in our case, will need to sort out certs/CA in future)

// Create Backend services for google cloud load balancing
function createBackendServices(
	entrypoints: NitricEntrypoints,
	deployedApis: DeployedApi[],
	deployedSites: DeployedSite[],
): BackendItem[] {
	const normalizedEntrypoints = Object.keys(entrypoints).map((epPath) => ({
		path: epPath,
		...entrypoints[epPath],
	}));

	return normalizedEntrypoints.map((ep) => {
		switch (ep.type) {
		case 'api': {
			const deployedApi = deployedApis.find((a) => a.name === ep.name);

			if (!deployedApi) {
				throw new Error(`Entrypoint: ${ep.path} contained target that does not exist!`);
			}

			const apiGatewayNEG = new compute.GlobalNetworkEndpointGroup(`${ep.name}-neg`, {
				networkEndpointType: 'INTERNET_FQDN_PORT',
			});

			const apiGatewayNE = new compute.GlobalNetworkEndpoint(`${ep.name}-ne`, {
				globalNetworkEndpointGroup: apiGatewayNEG.name,
				fqdn: deployedApi.gateway.defaultHostname,
				port: 443, // HTTPS
			});

			const backend = new compute.BackendService(`${ep.name}`, {
				backends: [{ group: apiGatewayNE.id }],
				// TODO: Determine CDN requirements for API gateways
				enableCdn: false,
				protocol: 'HTTPS',
			});

			return {
				name: ep.name,
				backend,
			};
		}
		case 'site': {
			const deployedSite = deployedSites.find((s) => s.name === ep.name);

			if (!deployedSite) {
				throw new Error(`Entrypoint: ${ep.path} contained target that does not exist!`);
			}

			const backend = new compute.BackendBucket(`${ep.name}`, {
				bucketName: deployedSite.bucket.name,
				// Enable CDN for sites
				enableCdn: true,
			});

			return {
				name: ep.name,
				backend,
			};
		}
		default:
			throw new Error(`Unsupported entrypoint type: ${ep.type}`);
		}
	});
}

function createURLMap(stackName: string, entrypoints: NitricEntrypoints, backends: BackendItem[]): compute.URLMap {
	const defaultEntrypoint = entrypoints['/'];
	const otherEntrypoints = Object.keys(entrypoints)
		.filter((k) => k !== '/')
		.map((k) => ({ path: k, ...entrypoints[k] }));

	pulumi.log.info(JSON.stringify(otherEntrypoints));

	if (!defaultEntrypoint) {
		throw new Error("A default entrypoint '/' is required");
	}

	const defaultBackend = backends.find((b) => b.name === defaultEntrypoint.name)!.backend;

	const pathRules = otherEntrypoints.length > 0
		?	otherEntrypoints.map((ep) => {
			const backend = backends.find((b) => b.name === ep.name)!.backend;

			return {
				paths: [`${ep.path}*`],
				service: backend.id,
			};
		})
		: undefined;

	return new compute.URLMap(`${stackName}-ep-url-map`, {
		defaultService: defaultBackend.id,
		hostRules: [{
			hosts: ['*'],
			pathMatcher: 'ep-matchers',
		}],
		pathMatchers: [
			{
				name: 'ep-matchers',
				defaultService: defaultBackend.id,
				pathRules,
			},
		],
	});
}

/**
 * Setup GCP loadbalances and services as well as CDN configurations
 */
export function createEntrypoints(
	stackName: string,
	entrypoints: NitricEntrypoints,
	deployedSites: DeployedSite[],
	deployedApis: DeployedApi[],
): void {
	// Created backend services
	const backends = createBackendServices(entrypoints, deployedApis, deployedSites);
	// Create URLMap
	const urlMap = createURLMap(stackName, entrypoints, backends);
	// Create FE HTTPS Proxy

	// Reserve a public IP address with google
	const ipAddress = new compute.GlobalAddress(`${stackName}address`, {});
	// Create SSL Certificate
	// FIXME: This will be for development deployments ONLY
	// a proper certificate will need ot be configured for production deployments
	const privateKey = new tls.PrivateKey(`${stackName}pk`, {
		algorithm: "RSA",
		rsaBits: 2048
	});

	const certificate = new tls.SelfSignedCert(`${stackName}ssc`, {
		privateKeyPem: privateKey.privateKeyPem,
		keyAlgorithm: "RSA",
		allowedUses: ["nonRepudiation", "digitalSignature", "keyEncipherment"],
		subjects: [{
			commonName: ipAddress.address,
			organization: "Nitric Pty Ltd",
		}],
		validityPeriodHours: 8760,
	});

	const sslCertificate = new compute.SSLCertificate(`${stackName}gcpcert`, {
		namePrefix: `${stackName}-certificate-`,
		certificate: certificate.certPem,
		privateKey: privateKey.privateKeyPem,
	});

	const httpProxy = new compute.TargetHttpsProxy(`${stackName}proxy`, {
		description: `Load Balancer for ${stackName}`,
		urlMap: urlMap.id,
		sslCertificates: [sslCertificate.id]
	});

	// Connect a front end to the load balancer
	new compute.GlobalForwardingRule(`${stackName}fwdrule`, {
		target: httpProxy.id,
		//allowGlobalAccess: true,
		//ipProtocol: "TCP",
		portRange: '443',
		ipAddress: ipAddress.address
	});
}

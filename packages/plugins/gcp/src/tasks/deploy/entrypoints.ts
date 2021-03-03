import { NitricEntrypoints } from '@nitric/cli-common';
import { compute } from '@pulumi/gcp';
import { DeployedApi, DeployedSite } from '../types';
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";

type Backend = compute.BackendBucket | compute.BackendService;

type BackendItem = {
	backend: Backend;
	name: string;
}

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
			const deployedApi = deployedApis.find(a => a.name === ep.name);

			if (!deployedApi) {
				throw new Error(`Entrypoint: ${ep.path} contained target that does not exist!`);
			}

			const apiGatewayNEG = new compute.GlobalNetworkEndpointGroup(`${ep.name}-NEG`, {
				networkEndpointType: 'INTERNET_FQDN_PORT',
			});

			const apiGatewayNE = new compute.GlobalNetworkEndpoint(`${ep.name}-NE`, {
				globalNetworkEndpointGroup: apiGatewayNEG.name,
				fqdn: deployedApi.gateway.defaultHostname,
				port: 443, // HTTPS
			});

			const backend = new compute.BackendService(`${ep.name}`,{
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
			const deployedSite = deployedSites.find(s => s.name === ep.name);

			if (!deployedSite) {
				throw new Error(`Entrypoint: ${ep.path} contained target that does not exist!`);
			}

			const backend =  new compute.BackendBucket(`${ep.name}`, {
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

function createURLMap(entrypoints: NitricEntrypoints, backends: BackendItem[]): compute.URLMap {
	const defaultEntrypoint = entrypoints['/']
	const otherEntrypoints = Object.keys(entrypoints)
		.filter(k => k !== "/")
		.map(k => ({ path: k, ...entrypoints[k] }));

	if (!defaultEntrypoint) {
		throw new Error("A default entrypoint '/' is required");
	}

	const defaultBackend = backends.find(b => b.name === defaultEntrypoint.name)!.backend;

	return new compute.URLMap(`ep-url-map`, {
		defaultService: defaultBackend.id,
		hostRules: [{
			hosts: ["*"],
			pathMatcher: "ep-matchers",
		}],
		pathMatchers: [{
			name: 'ep-matchers',
			defaultService: defaultBackend.id,
			pathRules: [{
				paths: ["/*"],
				service: defaultBackend.id,
			},
			...otherEntrypoints.map(ep => {
				const backend = backends.find(b => b.name === ep.name)!.backend;

				return {
					paths: [`${ep.path}*`],
					service: backend.id,
				};
			})],
		}]
	});
}

/**
 * Setup GCP loadbalances and services as well as CDN configurations
 */
export function createEntrypoints(stackName: string, entrypoints: NitricEntrypoints, deployedSites: DeployedSite[], deployedApis: DeployedApi[]): void {
	// Created backend services
	const backends = createBackendServices(entrypoints, deployedApis, deployedSites);
	// Create URLMap
	const urlMap = createURLMap(entrypoints, backends);
	// Create FE HTTPS Proxy
	
	// Create SSL Certificate
	// FIXME: This will be for development deployments ONLY
	// a proper certificate will need ot be configured for production deployments
	//const privateKey = new tls.PrivateKey(`${stackName}PK`, {
	//	algorithm: "RSA",
	//});

	//const certificate = new tls.SelfSignedCert(`${stackName}SSC`, {
	//	privateKeyPem: privateKey.privateKeyPem,
	//	keyAlgorithm: "RSA",
	//	allowedUses: [],
	//	subjects: [{
	//		commonName: "nitric.io",
	//		country: "AU",
	//		locality: "Sydney",
	//		organization: "Nitric"
	//		//organizationalUnit?: pulumi.Input<string>;
	//		//postalCode?: pulumi.Input<string>;
	//		//province?: pulumi.Input<string>;
	//		//serialNumber?: pulumi.Input<string>;
	//		//streetAddresses?: pulumi.Input<pulumi.Input<string>[]>;
	//	}],
	//	validityPeriodHours: 8760,
	//});

	//const sslCertificate = new compute.SSLCertificate(`${stackName}GCPCert`, {
	//	certificate: certificate.certPem,
	//	privateKey: certificate.privateKeyPem,
	//});

	new compute.TargetHttpProxy(`${stackName}Proxy`, {
		urlMap: urlMap.id,
	});

	//new compute.TargetHttpsProxy(`${stackName}Proxy`, {
	//	urlMap: urlMap.id,
	//	sslCertificates: [sslCertificate.id]
	//});
}

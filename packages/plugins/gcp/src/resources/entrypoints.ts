import { NitricEntrypoints } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import * as tls from '@pulumi/tls';
import { NitricSiteCloudStorage } from './site';
import { NitricApiGcpApiGateway } from './api';
import { NitricServiceCloudRun } from './service';

interface NitricEntrypointsGoogleCloudLBArgs {
	stackName: string;
	entrypoints: NitricEntrypoints;
	sites: NitricSiteCloudStorage[];
	apis: NitricApiGcpApiGateway[];
	services: NitricServiceCloudRun[];
}

/**
 * Nitric Entrypoints deployed using google cloud load balancers
 */
export class NitricEntrypointsGoogleCloudLB extends pulumi.ComponentResource {
	public readonly url: pulumi.Output<string>;

	constructor(name: string, args: NitricEntrypointsGoogleCloudLBArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:CloudStorage', name, {}, opts);
		const { stackName, entrypoints, sites, apis, services } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const normalizedEntrypoints = Object.keys(entrypoints).map((epPath) => ({
			path: epPath,
			...entrypoints[epPath],
		}));

		const backends = normalizedEntrypoints.map((ep) => {
			switch (ep.type) {
				case 'api': {
					const deployedApi = apis.find((a) => a.name === ep.name);

					if (!deployedApi) {
						throw new Error(`Entrypoint: ${ep.path} contained target ${ep.name} that does not exist!`);
					}

					const apiGatewayNEG = new gcp.compute.GlobalNetworkEndpointGroup(
						`${ep.name}-neg`,
						{
							networkEndpointType: 'INTERNET_FQDN_PORT',
							//defaultPort: 443,
						},
						defaultResourceOptions,
					);

					// Add the api gateways endpoint to the above group
					new gcp.compute.GlobalNetworkEndpoint(
						`${ep.name}-ne`,
						{
							globalNetworkEndpointGroup: apiGatewayNEG.name,
							fqdn: deployedApi.hostname,
							port: 443, // HTTPS
						},
						defaultResourceOptions,
					);

					const backend = new gcp.compute.BackendService(
						`${ep.name}`,
						{
							// Link the NEG to the backend
							backends: [{ group: apiGatewayNEG.id }],
							customRequestHeaders: [pulumi.interpolate`Host: ${deployedApi.hostname}`],
							// TODO: Determine CDN requirements for API gateways
							enableCdn: false,
							protocol: 'HTTPS',
						},
						defaultResourceOptions,
					);

					return {
						name: ep.name,
						backend,
					};
				}
				case 'site': {
					const deployedSite = sites.find((s) => s.name === ep.name);

					if (!deployedSite) {
						throw new Error(`Entrypoint: ${ep.path} contained target ${ep.name} that does not exist!`);
					}

					const backend = new gcp.compute.BackendBucket(
						`${ep.name}`,
						{
							bucketName: deployedSite.storage.name,
							// Enable CDN for sites
							enableCdn: true,
						},
						defaultResourceOptions,
					);

					return {
						name: ep.name,
						backend,
					};
				}
				case 'service': {
					const deployedFunction = services.find((s) => s.name === ep.name);

					if (!deployedFunction) {
						throw new Error(`Entrypoint: ${ep.path} contained target ${ep.path} that does not exist!`);
					}

					const serverlessNEG = new gcp.compute.RegionNetworkEndpointGroup(`${ep.name}neg`, {
						networkEndpointType: 'SERVERLESS',
						region: deployedFunction.cloudrun.location,
						cloudRun: {
							service: deployedFunction.cloudrun.name,
						},
					}, defaultResourceOptions);

					const backend = new gcp.compute.BackendService(`${ep.name}`, {
						// Link the NEG to the backend
						backends: [{ group: serverlessNEG.id }],
						// TODO: Determine CDN requirements for API gateways
						enableCdn: true,
						protocol: 'HTTPS',
					}, defaultResourceOptions);

					return {
						name: ep.name,
						backend,
					};
				}
				default:
					throw new Error(`Unsupported entrypoint type: ${ep.type}`);
			}
		});

		// Create the URL Map
		const defaultEntrypoint = entrypoints['/'];
		const otherEntrypoints = Object.keys(entrypoints)
			.filter((k) => k !== '/')
			.map((k) => ({ path: k, ...entrypoints[k] }));

		if (!defaultEntrypoint) {
			throw new Error("A default entrypoint '/' is required");
		}

		const defaultBackend = backends.find((b) => b.name === defaultEntrypoint.name)!.backend;

		pulumi.log.info(`default backend: ${defaultEntrypoint.name}`, defaultBackend);

		const pathRules =
			otherEntrypoints.length > 0
				? otherEntrypoints.map((ep) => {
						const backend = backends.find((b) => b.name === ep.name)!.backend;
						pulumi.log.info(`other backend: ${ep.name}`, backend);
						return {
							paths: [`${ep.path}*`],
							service: backend.id,
						};
				  })
				: undefined;

		const urlMap = new gcp.compute.URLMap(`${stackName}-ep-url-map`, {
			defaultService: defaultBackend.id,
			hostRules: [
				{
					hosts: ['*'],
					pathMatcher: 'ep-matchers',
				},
			],
			pathMatchers: [
				{
					name: 'ep-matchers',
					defaultService: defaultBackend.id,
					pathRules,
				},
			],
		}, defaultResourceOptions);

		// Reserve a public IP address with google
		const ipAddress = new gcp.compute.GlobalAddress(`${stackName}address`, {});
		// Create SSL Certificate
		// FIXME: This will be for development deployments ONLY
		// a proper certificate will need to be configured for production deployments
		const privateKey = new tls.PrivateKey(`${stackName}pk`, {
			algorithm: 'RSA',
			rsaBits: 2048,
		}, defaultResourceOptions);

		const certificate = new tls.SelfSignedCert(`${stackName}ssc`, {
			privateKeyPem: privateKey.privateKeyPem,
			keyAlgorithm: 'RSA',
			allowedUses: ['nonRepudiation', 'digitalSignature', 'keyEncipherment'],
			subjects: [
				{
					commonName: ipAddress.address,
					organization: 'Nitric Pty Ltd',
				},
			],
			validityPeriodHours: 8760,
		}, defaultResourceOptions);

		const sslCertificate = new gcp.compute.SSLCertificate(`${stackName}gcpcert`, {
			namePrefix: `${stackName}-certificate-`,
			certificate: certificate.certPem,
			privateKey: privateKey.privateKeyPem,
		}, defaultResourceOptions);

		pulumi.log.info("Connecting URL map to HTTP proxy", urlMap);

		const httpProxy = new gcp.compute.TargetHttpsProxy(`${stackName}proxy`, {
			description: `Load Balancer for ${stackName}`,
			urlMap: urlMap.id,
			sslCertificates: [sslCertificate.id],
		}, defaultResourceOptions);


		pulumi.log.info("Connecting Proxy to forwarding rule", httpProxy);
		// Connect a front end to the load balancer
		new gcp.compute.GlobalForwardingRule(`${stackName}fwdrule`, {
			target: httpProxy.id,
			portRange: '443',
			ipAddress: ipAddress.address,
		}, defaultResourceOptions);

		this.url = pulumi.interpolate`https://${ipAddress.address}`;

		this.registerOutputs({
			url: this.url,
		});
	}
}

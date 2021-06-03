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
import { NitricEntrypoint } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import * as tls from '@pulumi/tls';
import { NitricSiteCloudStorage } from './site';
import { NitricApiGcpApiGateway } from './api';
import { NitricServiceCloudRun } from './service';

interface NitricEntrypointGoogleCloudLBArgs {
	stackName: string;
	entrypoint: NitricEntrypoint;
	sites: NitricSiteCloudStorage[];
	apis: NitricApiGcpApiGateway[];
	services: NitricServiceCloudRun[];
}

/**
 * Nitric Entrypoints deployed using Google Cloud load balancers
 */
export class NitricEntrypointGoogleCloudLB extends pulumi.ComponentResource {
	public readonly url: pulumi.Output<string>;
	public readonly ipAddress: pulumi.Output<string>;

	constructor(name: string, args: NitricEntrypointGoogleCloudLBArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:CloudStorage', name, {}, opts);
		const { stackName, entrypoint, sites, apis, services } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const normalizedPaths = Object.entries(entrypoint.paths).map(([path, opts]) => ({
			path,
			...opts,
		}));

		const backends = normalizedPaths.map((entrypointPath) => {
			switch (entrypointPath.type) {
				case 'api': {
					const deployedApi = apis.find((a) => a.name === entrypointPath.target);

					if (!deployedApi) {
						throw new Error(
							`Entrypoint: ${entrypointPath.path} contained target ${entrypointPath.target} that does not exist!`,
						);
					}

					const apiGatewayNEG = new gcp.compute.GlobalNetworkEndpointGroup(
						`${entrypointPath.path}-neg`,
						{
							networkEndpointType: 'INTERNET_FQDN_PORT',
							//defaultPort: 443,
						},
						defaultResourceOptions,
					);

					// Add the api gateways endpoint to the above group
					new gcp.compute.GlobalNetworkEndpoint(
						`${entrypointPath.path}-ne`,
						{
							globalNetworkEndpointGroup: apiGatewayNEG.name,
							fqdn: deployedApi.hostname,
							port: 443, // HTTPS
						},
						defaultResourceOptions,
					);

					const backend = new gcp.compute.BackendService(
						`${entrypointPath.path}`,
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
						name: entrypointPath.target,
						backend,
					};
				}
				case 'site': {
					const deployedSite = sites.find((s) => s.name === entrypointPath.target);

					if (!deployedSite) {
						throw new Error(
							`Entrypoint: ${entrypointPath.path} contained target ${entrypointPath.target} that does not exist!`,
						);
					}

					const backend = new gcp.compute.BackendBucket(
						`${entrypointPath.path}`,
						{
							bucketName: deployedSite.storage.name,
							// Enable CDN for sites
							enableCdn: true,
						},
						defaultResourceOptions,
					);

					return {
						name: entrypointPath.target,
						backend,
					};
				}
				case 'service': {
					const deployedFunction = services.find((s) => s.name === entrypointPath.target);

					if (!deployedFunction) {
						throw new Error(
							`Entrypoint: ${entrypointPath.path} contained target ${entrypointPath.target} that does not exist!`,
						);
					}

					const serverlessNEG = new gcp.compute.RegionNetworkEndpointGroup(
						`${entrypointPath.path}neg`,
						{
							networkEndpointType: 'SERVERLESS',
							region: deployedFunction.cloudrun.location,
							cloudRun: {
								service: deployedFunction.cloudrun.name,
							},
						},
						defaultResourceOptions,
					);

					const backend = new gcp.compute.BackendService(
						`${entrypointPath.path}`,
						{
							// Link the NEG to the backend
							backends: [{ group: serverlessNEG.id }],
							// TODO: Determine CDN requirements for API gateways
							enableCdn: true,
							protocol: 'HTTPS',
						},
						defaultResourceOptions,
					);

					return {
						name: entrypointPath.target,
						backend,
					};
				}
				default:
					throw new Error(`Unsupported entrypoint type: ${entrypointPath.type}`);
			}
		});

		// Create the URL Map
		const defaultEntrypoint = entrypoint.paths['/'];
		const otherEntrypoints = Object.keys(entrypoint.paths)
			.filter((k) => k !== '/')
			.map((k) => ({ path: k, ...entrypoint.paths[k] }));

		if (!defaultEntrypoint) {
			throw new Error("A default entrypoint '/' is required");
		}

		const defaultBackend = backends.find((b) => b.name === defaultEntrypoint.target)!.backend;

		pulumi.log.info(`default backend: ${defaultEntrypoint.target}`, defaultBackend);

		const pathRules =
			otherEntrypoints.length > 0
				? otherEntrypoints.map((ep) => {
						const backend = backends.find((b) => b.name === ep.name)!.backend;
						pulumi.log.info(`other backend: ${ep.target}`, backend);
						return {
							paths: [`${ep.path}*`],
							service: backend.id,
						};
				  })
				: undefined;

		const urlMap = new gcp.compute.URLMap(
			`${stackName}-ep-url-map`,
			{
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
			},
			defaultResourceOptions,
		);

		let certificate: gcp.compute.ManagedSslCertificate | gcp.compute.SSLCertificate;
		let ipAddress: gcp.compute.GlobalAddress | undefined;

		// let sslCertificate;
		if (entrypoint.domains && entrypoint.domains.length > 0) {
			certificate = new gcp.compute.ManagedSslCertificate(
				`${stackName}gcpcert`,
				{
					managed: {
						domains: entrypoint.domains,
					},
				},
				defaultResourceOptions,
			);

			this.url = pulumi.interpolate`https://${entrypoint.domains[0]}`;
		} else {
			// Reserve a public IP address with google
			ipAddress = new gcp.compute.GlobalAddress(`${stackName}address`, {});
			// Create SSL Certificate
			// FIXME: This will be for development deployments ONLY
			// a proper certificate will need to be configured for production deployments
			const privateKey = new tls.PrivateKey(
				`${stackName}pk`,
				{
					algorithm: 'RSA',
					rsaBits: 2048,
				},
				defaultResourceOptions,
			);

			const selfSignedCert = new tls.SelfSignedCert(
				`${stackName}ssc`,
				{
					privateKeyPem: privateKey.privateKeyPem,
					keyAlgorithm: 'RSA',
					allowedUses: ['nonRepudiation', 'digitalSignature', 'keyEncipherment'],
					subjects: [
						{
							commonName: ipAddress.address,
							organization: 'self-signed',
						},
					],
					validityPeriodHours: 8760,
				},
				defaultResourceOptions,
			);

			// Self-signed for development purposes
			// TODO: Support this for production deployments too.
			certificate = new gcp.compute.SSLCertificate(
				`${stackName}gcpcert`,
				{
					namePrefix: `${stackName}-certificate-`,
					certificate: selfSignedCert.certPem,
					privateKey: privateKey.privateKeyPem,
				},
				defaultResourceOptions,
			);

			this.url = pulumi.interpolate`https://${ipAddress}`;
		}
		

		pulumi.log.info('Connecting URL map to HTTP proxy', urlMap);

		const httpProxy = new gcp.compute.TargetHttpsProxy(
			`${stackName}proxy`,
			{
				description: `Load Balancer for ${stackName}:${name}`,
				urlMap: urlMap.id,

				sslCertificates: [certificate.id],
			},
			defaultResourceOptions,
		);

		pulumi.log.info('Connecting Proxy to forwarding rule', httpProxy);
		// Connect a front end to the load balancer
		const forwardingRule = new gcp.compute.GlobalForwardingRule(
			`${stackName}fwdrule`,
			{
				target: httpProxy.id,
				portRange: '443',
				ipAddress: ipAddress && ipAddress.address,
			},
			defaultResourceOptions,
		);

		this.ipAddress = forwardingRule.ipAddress,

		this.registerOutputs({
			url: this.url,
			ipAddress: this.ipAddress,
		});
	}
}

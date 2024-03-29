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
import { NamedObject, NitricEntrypoint } from '@nitric/cli-common';
import { resources, network, types } from '@pulumi/azure-native';
import { NitricComputeAzureContainerApp, NitricAzureStorageSite, NitricApiAzureApiManagement } from '.';

interface NitricAzureStorageBucketArgs {
	stackName: string;
	subscriptionId: pulumi.Input<string>;
	entrypoint: NamedObject<NitricEntrypoint>;
	services: NitricComputeAzureContainerApp[];
	sites: NitricAzureStorageSite[];
	apis: NitricApiAzureApiManagement[];
	resourceGroup: resources.ResourceGroup;
}

interface TranslatedRouteRules {
	pool: types.input.network.BackendPoolArgs;
	route: types.input.network.RoutingRuleArgs;
}

type DefaultOdataType = pulumi.Input<'#Microsoft.Azure.FrontDoor.Models.FrontdoorForwardingConfiguration'>;

const DEFAULT_ODATA_TYPE: DefaultOdataType = '#Microsoft.Azure.FrontDoor.Models.FrontdoorForwardingConfiguration';

/**
 * Nitric Azure Front Door based Entrypoint
 */
export class NitricEntrypointAzureFrontDoor extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly domains?: string[];
	// TODO: Create resource
	public readonly resourceGroup: resources.ResourceGroup;
	public readonly frontdoor: network.FrontDoor;

	constructor(name: string, args: NitricAzureStorageBucketArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:entrypoint:AzureFrontDoor', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, subscriptionId, entrypoint, stackName, sites, apis, services } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.domains = entrypoint.domains;
		const frontDoorName = `${stackName}-${name}`;

		const rules = Object.keys(entrypoint.paths).map<TranslatedRouteRules>((key) => {
			const { type, target } = entrypoint.paths[key];

			const poolName = `${type}-${target}-pool`;
			const routeName = `${type}-${target}-route`;
			const routeConfig = {
				backendPool: {
					id: pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup.name}/providers/Microsoft.Network/frontDoors/${frontDoorName}/backendPools/${poolName}`,
				},
				odataType: DEFAULT_ODATA_TYPE,
			};
			const feEndpoints = [
				{
					id: pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup.name}/providers/Microsoft.Network/frontDoors/${frontDoorName}/frontendEndpoints/default`,
				},
			];
			const healthProbeSettings = {
				id: pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup.name}/providers/Microsoft.Network/frontDoors/${frontDoorName}/healthProbeSettings/healthProbeSettings1`,
			};
			const loadBalancingSettings = {
				id: pulumi.interpolate`/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup.name}/providers/Microsoft.Network/frontDoors/${frontDoorName}/loadBalancingSettings/loadBalancingSettings1`,
			};

			switch (type) {
				case 'api': {
					const deployedApi = apis.find((a) => a.name === target);

					if (!deployedApi) {
						throw new Error(`Target API ${name} configured in entrypoints but does not exist`);
					}

					const domainName = deployedApi.api.serviceUrl;
					if (!domainName) {
						throw new Error(`Target API ${name} does not have a defined serviceUrl`);
					}

					return {
						pool: {
							name: poolName,
							backends: [
								{
									address: domainName as pulumi.Output<string>,
									backendHostHeader: domainName as pulumi.Output<string>,
									httpPort: 80,
									httpsPort: 443,
									priority: 1,
									weight: 1,
								},
							],
							loadBalancingSettings,
							healthProbeSettings,
						},
						route: {
							name: routeName,
							acceptedProtocols: ['Https'],
							enabledState: 'Enabled',
							patternsToMatch: [`${key}*`],
							routeConfiguration: routeConfig,
							frontendEndpoints: feEndpoints,
						},
					};
				}
				case 'site': {
					const deployedSite = sites.find((a) => a.name === target);

					if (!deployedSite) {
						throw new Error(`Target Site ${name} configured in entrypoints but does not exist`);
					}

					const endpointOrigin = deployedSite.storageAccount.primaryEndpoints.apply((ep) =>
						ep.web.replace('https://', '').replace('/', ''),
					);

					return {
						pool: {
							name: poolName,
							backends: [
								{
									address: endpointOrigin,
									backendHostHeader: endpointOrigin,
									httpPort: 80,
									httpsPort: 443,
									priority: 1,
									weight: 1,
								},
							],
							loadBalancingSettings,
							healthProbeSettings,
						},
						route: {
							name: routeName,
							acceptedProtocols: ['Https'],
							enabledState: 'Enabled',
							patternsToMatch: [`${key}*`],
							// TODO: Will probably change this to redirect instead of forwarding for sites
							routeConfiguration: routeConfig,
							frontendEndpoints: feEndpoints,
						},
					};
				}
				case 'container':
				case 'function': {
					const deployedService = services.find((a) => a.name === target);

					if (!deployedService) {
						throw new Error(`Target container or function ${name} configured in entrypoints but does not exist`);
					}

					return {
						pool: {
							name: poolName,
							backends: [
								{
									address: deployedService.containerApp.latestRevisionFqdn,
									backendHostHeader: deployedService.containerApp.latestRevisionFqdn,
									httpPort: 80,
									httpsPort: 443,
									priority: 1,
									weight: 1,
								},
							],
							healthProbeSettings,
							loadBalancingSettings,
						},
						route: {
							name: routeName,
							acceptedProtocols: ['Https'],
							enabledState: 'Enabled',
							patternsToMatch: [`${key}*`],
							routeConfiguration: routeConfig,
							frontendEndpoints: feEndpoints,
						},
					};
				}
				default: {
					throw new Error(`Invalid entrypoint type:${type} defined`);
				}
			}
		});

		this.frontdoor = new network.FrontDoor(
			this.name,
			{
				// Location MUST be global
				location: 'global',
				resourceGroupName: this.resourceGroup.name,
				enabledState: 'Enabled',
				frontDoorName,
				// Create backend pools from stack configuration
				backendPools: rules.map(({ pool }) => pool),
				// Add default front door and any custom
				// domain names
				frontendEndpoints: [
					// TODO: Create domain mapped http endpoints based
					// on user configeured domains
					//{
					//	hostName: 'www.contoso.com',
					//	name: 'frontendEndpoint1',
					//	sessionAffinityEnabledState: 'Enabled',
					//	sessionAffinityTtlSeconds: 60,
					//	webApplicationFirewallPolicyLink: {
					//		id: '/subscriptions/subid/resourceGroups/rg1/providers/Microsoft.Network/frontDoorWebApplicationFirewallPolicies/policy1',
					//	},
					//},
					{
						hostName: `${frontDoorName}.azurefd.net`,
						name: 'default',
					},
				],
				// Create routing rules from load balancer path configs
				routingRules: rules.map(({ route }) => route),
				loadBalancingSettings: [
					{
						name: 'loadBalancingSettings1',
						sampleSize: 4,
						successfulSamplesRequired: 2,
					},
				],
				healthProbeSettings: [
					{
						enabledState: 'Disabled',
						healthProbeMethod: 'HEAD',
						intervalInSeconds: 120,
						name: 'healthProbeSettings1',
						path: '/',
						protocol: 'Http',
					},
				],
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			name: this.name,
		});
	}
}

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
import { types, authorization, resources, web, containerregistry, eventgrid } from '@pulumi/azure-native';
import { NitricContainerImage, StackFunction, StackContainer } from '@nitric/cli-common';
import { NitricEventgridTopic } from './topic';

export interface NitricComputeAzureAppServiceEnvVariable {
	name: string;
	value: string | pulumi.Output<string>;
}

interface NitricComputeAzureAppServiceArgs {
	/**
	 * SubscriptionId this resources is being deployed under
	 */
	subscriptionId: string | pulumi.Output<string>;

	/**
	 * Azure resource group to deploy func to
	 */
	resourceGroup: resources.ResourceGroup;

	/**
	 * App Service plan to deploy this func to
	 */
	plan: web.AppServicePlan;

	/**
	 * Nitric Function or Custom Container
	 */
	source: StackFunction | StackContainer;

	/**
	 * Registry the image is deployed to
	 */
	registry: containerregistry.Registry;

	/**
	 * A deployed Nitric Image
	 */
	image: NitricContainerImage;

	/**
	 * Deployed Nitric Service Topics
	 */
	topics: NitricEventgridTopic[];

	/**
	 * Environment variables for this compute instance
	 */
	env?: NitricComputeAzureAppServiceEnvVariable[];
}

// Built in role definitions for Azure
// See below URL for mapping
// https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
const ROLE_DEFINITION_MAP = {
	KeyVaultSecretsOfficer: 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7',
	StorageBlobDataContributor: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe',
	StorageQueueDataContributor: '974c5e8b-45b9-4653-ba55-5f855dd0fb88',
	EventGridDataSender: 'd5a91429-5739-47e2-a06b-3470a27159e7',
};

/**
 * Azure App Service implementation of a Nitric Function or Custom Container
 */
export class NitricComputeAzureAppService extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly webapp: web.WebApp;

	constructor(name: string, args: NitricComputeAzureAppServiceArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:func:AppService', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { source, subscriptionId, resourceGroup, plan, registry, image, topics, env = [] } = args;

		this.name = name;

		const nitricContainer = source.getDescriptor();

		const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(([resourceGroupName, registryName]) =>
			containerregistry.listRegistryCredentials({
				resourceGroupName: resourceGroupName,
				registryName: registryName,
			}),
		);
		const adminUsername = credentials.apply((credentials) => credentials.username!);
		const adminPassword = credentials.apply((credentials) => credentials.passwords![0].value!);

		// TODO: We will write a separate function app gateway much like we did for
		// AWS Lambda, it appears that RPC is used between the function host and workers
		// https://github.com/Azure/azure-functions-language-worker-protobuf
		// So hopefully this should be as simple as including a gateway plugin for
		// Azure that utilizes that contract.
		// return new appservice.FunctionApp()
		this.webapp = new web.WebApp(
			source.getName(),
			{
				serverFarmId: plan.id,
				name: `${source.getStack().getName()}-${source.getName()}`,
				resourceGroupName: resourceGroup.name,
				identity: {
					type: 'SystemAssigned',
				},
				siteConfig: {
					appSettings: [
						{
							name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE',
							value: 'false',
						},
						{
							name: 'DOCKER_REGISTRY_SERVER_URL',
							value: pulumi.interpolate`https://${registry.loginServer}`,
						},
						{
							name: 'DOCKER_REGISTRY_SERVER_USERNAME',
							value: adminUsername,
						},
						{
							name: 'DOCKER_REGISTRY_SERVER_PASSWORD',
							value: adminPassword,
						},
						{
							name: 'WEBSITES_PORT',
							value: '9001',
						},
						// Append additional env variables
						...env,
					],
					// alwaysOn: true,
					linuxFxVersion: pulumi.interpolate`DOCKER|${image.imageUri}`,
				},
			},
			defaultResourceOptions,
		);
		const { triggers = {} } = nitricContainer;

		// Assign roles to the deployed app service
		Object.entries(ROLE_DEFINITION_MAP).map(
			([name, id]) =>
				new authorization.RoleAssignment(
					`${source.getName()}${name}`,
					{
						principalId: this.webapp.identity.apply((t) => t!.principalId),
						principalType: types.enums.authorization.PrincipalType.ServicePrincipal,
						roleDefinitionId: pulumi.interpolate`/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${id}`,
						scope: pulumi.interpolate`subscriptions/${subscriptionId}/resourceGroups/${resourceGroup.name}`,
					},
					defaultResourceOptions,
				),
		);

		// Deploy an evengrid webhook subscription
		(triggers.topics || []).forEach((s) => {
			const topic = topics.find((t) => t.name === s);

			if (topic) {
				new eventgrid.EventSubscription(
					`${source.getName()}-${topic.name}-subscription`,
					{
						eventSubscriptionName: `${source.getName()}-${topic.name}-subscription`,
						scope: topic.eventgrid.id,
						destination: {
							endpointType: 'WebHook',
							endpointUrl: this.webapp.defaultHostName,
							// TODO: Reduce event chattiness here and handle internally in the Azure AppService HTTP Gateway?
							maxEventsPerBatch: 1,
						},
					},
					defaultResourceOptions,
				);
			}

			// TODO: Throw error in case of misconfiguration?
		});

		this.registerOutputs({
			wepapp: this.webapp,
			name: this.name,
		});
	}
}

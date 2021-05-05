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

import { Service } from '@nitric/cli-common';
import { resources, web, eventgrid, containerregistry } from '@pulumi/azure-native';
import { DeployedService, DeployedTopic } from '../types';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';

// deploy a nitric function to microsoft azure as an AppService application
export function createFunctionAsApp(
	resourceGroup: resources.ResourceGroup,
	registry: containerregistry.Registry,
	plan: web.AppServicePlan,
	service: Service,
	topics: DeployedTopic[],
): DeployedService {
	const nitricService = service.asNitricService();

	const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(([resourceGroupName, registryName]) =>
		containerregistry.listRegistryCredentials({
			resourceGroupName: resourceGroupName,
			registryName: registryName,
		}),
	);
	const adminUsername = credentials.apply((credentials) => credentials.username!);
	const adminPassword = credentials.apply((credentials) => credentials.passwords![0].value!);

	const image = new docker.Image(`${service.getImageTagName()}-image`, {
		imageName: pulumi.interpolate`${registry.loginServer}/${service.getImageTagName()}`,
		build: {
			// Staging directory
			context: service.getStagingDirectory(),
			args: {
				PROVIDER: 'azure',
			},
			// Create a reasonable shared memory space for image builds
			extraOptions: ['--shm-size', '1G'],
		},
		registry: {
			server: registry.loginServer,
			// TODO: Figure out how to get login details on new next-gen api
			username: adminUsername,
			password: adminPassword,
		},
	});

	// TODO: We will write a seperate function app gateway much like we did for
	// AWS Lambda, it appears that RPC is used between the function host and workers
	// https://github.com/Azure/azure-functions-language-worker-protobuf
	// So hopefully this should be as simple as including a gateway plugin for
	// Azure that utilizes that contract.
	// return new appservice.FunctionApp()

	const deployedApp = new web.WebApp(service.getName(), {
		serverFarmId: plan.id,
		name: `${service.getStack().getName()}-${service.getName()}`,
		resourceGroupName: resourceGroup.name,
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
			],
			// alwaysOn: true,
			linuxFxVersion: pulumi.interpolate`DOCKER|${image.imageName}`,
		},
	});
	const { triggers = {} } = nitricService;

	// Deploy an evengrid webhook subscription
	(triggers.topics || []).forEach((s) => {
		const topic = topics.find((t) => t.name === s);

		if (topic) {
			new eventgrid.EventSubscription(`${service.getName()}-${topic.name}-subscription`, {
				eventSubscriptionName: `${service.getName()}-${topic.name}-subscription`,
				scope: topic.eventGridTopic.id,
				destination: {
					endpointType: 'WebHook',
					endpointUrl: deployedApp.defaultHostName,
					// TODO: Reduce event chattiness here and handle internally in the Azure AppService HTTP Gateway?
					maxEventsPerBatch: 1,
				},
			});
		}

		// TODO: Throw error in case of misconfiguration?
	});

	return {
		name: service.getName(),
		...nitricService,
		appService: deployedApp,
	};
}

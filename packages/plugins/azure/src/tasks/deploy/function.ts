import { Function } from '@nitric/cli-common';
import { resources, web, eventgrid, containerregistry } from '@pulumi/azure-native';
import { DeployedFunction, DeployedTopic } from '../types';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';

// deploy a nitric function to microsoft azure as an AppService application
export function createFunctionAsApp(
	resourceGroup: resources.latest.ResourceGroup,
	registry: containerregistry.latest.Registry,
	plan: web.latest.AppServicePlan,
	func: Function,
	topics: DeployedTopic[],
): DeployedFunction {
	const nitricFunction = func.asNitricFunction();

	const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(([resourceGroupName, registryName]) =>
		containerregistry.latest.listRegistryCredentials({
			resourceGroupName: resourceGroupName,
			registryName: registryName,
		}),
	);
	const adminUsername = credentials.apply((credentials) => credentials.username!);
	const adminPassword = credentials.apply((credentials) => credentials.passwords![0].value!);

	const image = new docker.Image(`${func.getImageTagName()}-image`, {
		imageName: pulumi.interpolate`${registry.loginServer}/${func.getImageTagName()}`,
		build: {
			// Staging directory
			context: func.getStagingDirectory(),
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

	const deployedApp = new web.latest.WebApp(nitricFunction.name, {
		serverFarmId: plan.id,
		name: `${func.getStack().getName()}-${nitricFunction.name}`,
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
	const { subs = [] } = nitricFunction;

	// Deploy an evengrid webhook subscription
	(subs || []).forEach((s) => {
		const topic = topics.find((t) => t.name === s.topic);

		if (topic) {
			new eventgrid.latest.EventSubscription(`${nitricFunction.name}-${topic.name}-subscription`, {
				eventSubscriptionName: `${nitricFunction.name}-${topic.name}-subscription`,
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
		...nitricFunction,
		appService: deployedApp,
	};
}

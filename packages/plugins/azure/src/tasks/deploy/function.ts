import { Function } from "@nitric/cli-common";
import { core, appservice, eventgrid, containerservice } from "@pulumi/azure-nextgen";
import { DeployedFunction, DeployedTopic } from "../types";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

// deploy a nitric function to microsoft azure as an AppService application
export function createFunctionAsApp(
	resourceGroup: core.ResourceGroup,
	registry: containerservice.Registry, 
	plan: appservice.Plan, 
	func: Function, 
	topics: DeployedTopic[]
): DeployedFunction {
	const nitricFunction = func.asNitricFunction();

	const image = new docker.Image(`${func.getImageTagName()}-image`, {
		imageName: pulumi.interpolate`${registry.loginServer}/${func.getImageTagName()}`,
		build: {
			// Staging directory
			context: func.getStagingDirectory(),
			args: {
				provider: 'azure'
			},
		},
		registry: {
			server: registry.loginServer,
			username: registry.adminUsername,
			password: registry.adminPassword,
		}
	});
	
	// TODO: We will write a seperate function app gateway much like we did for
	// AWS Lambda, it appears that RPC is used between the function host and workers
	// https://github.com/Azure/azure-functions-language-worker-protobuf
	// So hopefully this should be as simple as including a gateway plugin for
	// Azure that utilizes that contract.
	// return new appservice.FunctionApp()

	
	const deployedApp = new appservice.AppService(nitricFunction.name, {
		appServicePlanId: plan.id,
		resourceGroupName: resourceGroup.name,
		siteConfig: {
			// TODO: Include our custom docker image here...
			// XXX: We'll push it to the ACR first
			linuxFxVersion: pulumi.interpolate`DOCKER|${image.imageName}`,
		},
	});
	const { subs = [] } = nitricFunction;
	
	// Deploy an evengrid webhook subscription
	(subs || []).forEach(s => {
		const topic = topics.find(t => t.name === s.topic);

		if (topic) {
			new eventgrid.EventSubscription(`${nitricFunction.name}-${topic.name}-subscription`, {
				scope: topic.eventGridTopic.id,
				webhookEndpoint: {
					url: deployedApp.defaultSiteHostname,
				}
			});
		}

		// TODO: Throw error in case of misconfiguration?
	});

	return {
		...nitricFunction,
		appService: deployedApp,
	};
}
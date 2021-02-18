import { NitricFunction } from "@nitric/cli-common";
import { core, appservice, eventgrid } from "@pulumi/azure";
import { DeployedTopic } from "../types";

// deploy a nitric function to microsoft azure as an AppService application
export function createFunctionAsApp(resourceGroup: core.ResourceGroup, plan: appservice.Plan, func: NitricFunction, topics: DeployedTopic[]): appservice.AppService {
	
	// TODO: We will write a seperate function app gateway much like we did for
	// AWS Lambda, it appears that RPC is used between the function host and workers
	// https://github.com/Azure/azure-functions-language-worker-protobuf
	// So hopefully this should be as simple as including a gateway plugin for
	// Azure that utilizes that contract.
	//return new appservice.FunctionApp()

	
	const deployedApp = new appservice.AppService(func.name, {
		appServicePlanId: plan.id,
		resourceGroupName: resourceGroup.name,
		siteConfig: {
			// TODO: Include our custom docker image here...
			// XXX: We'll push it to the ACR first
			linuxFxVersion: "DOCKER|mcr.microsoft.com/"
		},
	});
	//const { subs = [] } = func;
	
	// Deploy an evengrid webhook subscription
	//subs.forEach(s => {
	//	const topic = topics.find(t => t.name === s.topic);

	//	new eventgrid.EventSubscription(`${func.name}-${t.name}-subscription`, {
	//		topic
	//		webhookEndpoint: {

	//		}
	//	});
	//});	
}
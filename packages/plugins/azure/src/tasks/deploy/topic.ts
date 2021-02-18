import { NitricTopic } from "@nitric/cli-common";
import { core, eventgrid } from "@pulumi/azure";
import { DeployedTopic } from "../types";

// Create a topic on azure event grid
export function createTopic(resourceGroup: core.ResourceGroup, topic: NitricTopic): DeployedTopic {
	const deployedTopic = new eventgrid.Topic(topic.name, {
		name: topic.name,
		resourceGroupName: resourceGroup.name,
	});

	return {
		...topic,
		eventGridTopic: deployedTopic,
	};
}
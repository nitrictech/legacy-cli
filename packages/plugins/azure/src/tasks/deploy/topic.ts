import { NitricTopic } from "@nitric/cli-common";
import { resources, eventgrid } from "@pulumi/azure-nextgen";
import { DeployedTopic } from "../types";

// Create a topic on azure event grid
export function createTopic(resourceGroup: resources.latest.ResourceGroup, topic: NitricTopic): DeployedTopic {
	const deployedTopic = new eventgrid.latest.Topic(topic.name, {
		topicName: topic.name,
		resourceGroupName: resourceGroup.name,
	});

	return {
		...topic,
		eventGridTopic: deployedTopic,
	};
}
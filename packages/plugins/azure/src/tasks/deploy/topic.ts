import { NitricTopic } from "@nitric/cli-common";
import { resources, eventgrid } from "@pulumi/azure-nextgen";
import { DeployedTopic } from "../types";
import * as pulumi from "@pulumi/pulumi";

// Create a topic on azure event grid
export function createTopic(resourceGroup: resources.latest.ResourceGroup, topic: NitricTopic): DeployedTopic {
	const deployedTopic = new eventgrid.latest.Topic(topic.name, {
		topicName: topic.name,
		resourceGroupName: resourceGroup.name,
	});

	// Get the shared access keys

	const sasKeys = pulumi.all([resourceGroup.name, topic.name]).apply(([resourceGroupName, topicName]) => 
		eventgrid.latest.listTopicSharedAccessKeys({
			resourceGroupName,
			topicName,
		})
	);

	const key1 = sasKeys.apply(k => k.key1!);
	const key2 = sasKeys.apply(k => k.key2!);

	return {
		...topic,
		eventGridTopic: deployedTopic,
		// Get the SAS keys for the topic
		// these will be used when connecting to logic apps for scheduling 
		sasKeys: [key1, key2],
	};
}
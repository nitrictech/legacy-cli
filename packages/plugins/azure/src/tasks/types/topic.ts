import { NitricTopic } from "@nitric/cli-common";
import { eventgrid } from "@pulumi/azure";

export interface DeployedTopic extends NitricTopic {
	eventGridTopic: eventgrid.Topic;
}
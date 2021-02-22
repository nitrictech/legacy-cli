import { NitricTopic } from "@nitric/cli-common";
import { eventgrid } from "@pulumi/azure-nextgen";

export interface DeployedTopic extends NitricTopic {
	eventGridTopic: eventgrid.latest.Topic;
}
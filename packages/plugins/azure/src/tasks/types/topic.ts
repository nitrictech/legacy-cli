import { NitricTopic } from '@nitric/cli-common';
import { eventgrid } from '@pulumi/azure-native';
import { Output } from '@pulumi/pulumi';

export interface DeployedTopic extends NitricTopic {
	eventGridTopic: eventgrid.Topic;
	sasKeys: Output<string>[];
}

import { NitricTopic } from '@nitric/cli-common';
import { eventgrid } from '@pulumi/azure-nextgen';
import { Output } from '@pulumi/pulumi';

export interface DeployedTopic extends NitricTopic {
	eventGridTopic: eventgrid.latest.Topic;
	sasKeys: Output<string>[];
}

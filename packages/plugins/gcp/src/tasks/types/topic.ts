import { NitricTopic } from '@nitric/cli-common';
import { pubsub } from '@pulumi/gcp';

export interface DeployedTopic extends NitricTopic {
	pubsub: pubsub.Topic;
}

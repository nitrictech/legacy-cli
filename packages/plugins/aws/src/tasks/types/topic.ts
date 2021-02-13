import { NitricTopic } from '@nitric/cli-common';
import { sns } from '@pulumi/aws';

// Model for a topic deployed to AWS with pulumi
export interface DeployedTopic extends NitricTopic {
	awsTopic: sns.Topic;
}

import { NitricTopic } from '@nitric/cli-common';
import { sns } from '@pulumi/aws';
import { DeployedTopic } from '../types';

export function createTopic(topic: NitricTopic): DeployedTopic {
	return {
		...topic,
		awsTopic: new sns.Topic(topic.name, {
			name: topic.name,
		}),
	};
}
// TopicName
// The name of the topic you want to create. Topic names must include only uppercase and lowercase ASCII letters, numbers, underscores, and hyphens, and must be between 1 and 256 characters long. FIFO topic names must end with .fifo.

// If you don't specify a name, AWS CloudFormation generates a unique physical ID and uses that ID for the topic name. For more information, see Name Type.

// Important
// If you specify a name, you can't perform updates that require replacement of this resource. You can perform updates that require no or some interruption. If you must replace the resource, specify a new name.

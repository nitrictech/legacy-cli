import { NitricTopic } from '@nitric/cli-common';
import { pubsub } from '@pulumi/gcp';
import { DeployedTopic } from './types';


/**
 * Create a new pubsub topic
 */
export function createTopic(topic: NitricTopic): DeployedTopic {
	const pubsubTopic = new pubsub.Topic(topic.name, {
		name: topic.name,
	});

	return {
		...topic,
		pubsub: pubsubTopic,
	};
};

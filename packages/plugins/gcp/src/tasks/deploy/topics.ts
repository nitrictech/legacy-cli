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

/**
 * Create deployment manager resources for a given topic
 * @param topic
 */
export default function (topic: NitricTopic): any[] {
	let resources = [] as any[];

	resources = [
		{
			type: 'gcp-types/pubsub-v1:projects.topics',
			name: topic.name,
			properties: {
				topic: topic.name,
			},
		},
	];

	return resources;
}

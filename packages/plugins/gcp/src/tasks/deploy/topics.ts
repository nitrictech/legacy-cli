import { NitricTopic } from '@nitric/cli-common';
import { pubsub } from '@pulumi/gcp';

/**
 * Create deployment manager resources for a given topic
 * @param topic
 */
export default function (topic: NitricTopic): { [key: string]: any } {
	let resources = {};

	resources = {
		...resources,
		[topic.name]: new pubsub.Topic(topic.name, {
			name: topic.name,
		}),
	};

	return resources;
}

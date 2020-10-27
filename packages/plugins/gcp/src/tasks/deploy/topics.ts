import { NitricTopic } from '@nitric/cli-common';

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

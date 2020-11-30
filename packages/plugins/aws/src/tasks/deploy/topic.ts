import { normalizeTopicName, NitricTopic } from '@nitric/cli-common';

// TODO: We'll also need to get the IPs of the NitricFunction resources
export default (topic: NitricTopic): Record<string, any> => {
	const topicName = normalizeTopicName(topic);
	const topicDefName = topicName + 'Def';

	return {
		[topicDefName]: {
			Type: 'AWS::SNS::Topic',
			Properties: {
				DisplayName: topicName,
			},
		},
	};
};

import { NitricSchedule } from '@nitric/cli-common';
import { cloudscheduler } from '@pulumi/gcp';
import { DeployedSchedule, DeployedTopic } from './types';

export function createSchedule(schedule: NitricSchedule, topics: DeployedTopic[]): DeployedSchedule {
	// Find our target topic

	// Currently we only support topic targets for schedules
	const topic = topics.find((t) => t.name === schedule.target.id);

	if (topic) {
		const job = new cloudscheduler.Job(schedule.name, {
			timeZone: 'UTC',
			description: `scheduled trigger for ${schedule.target.id}`,
			pubsubTarget: {
				topicName: topic.pubsub.name,
				data: Buffer.from(JSON.stringify(schedule.event)).toString('base64'),
			},
			schedule: schedule.expression,
		});

		return {
			...schedule,
			job,
		};
	}

	throw new Error(`Miconfiguration error ${schedule.target.id} does not exist in stack`);
}

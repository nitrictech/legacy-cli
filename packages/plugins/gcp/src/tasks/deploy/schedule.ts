import { NitricSchedule } from '@nitric/cli-common';
import { cloudscheduler } from '@pulumi/gcp';
import { DeployedSchedule, DeployedTopic } from './types';

export function createSchedule(schedule: NitricSchedule, topics: DeployedTopic[]): DeployedSchedule {
	// Find our target topic

	// Currently we only support topic targets for schedules
	const topic = topics.find(t => t.name === schedule.target.id)

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

/**
 * Translate a NitricSchedule into a GCP Cloud Scheduler Deployment
 */
export default function (project: string, schedule: NitricSchedule, region: string): any[] {
	// Define function as the initial resources...
	const resources: any[] = [
		{
			// NOTE: This is supported but not documented
			type: 'gcp-types/cloudscheduler-v1:projects.locations.jobs',
			name: schedule.name,
			properties: {
				parent: `projects/${project}/locations/${region}`,
				name: schedule.name,
				description: `scheduled trigger for ${schedule.target.id}`,
				// TODO: Potentially support other target types
				timeZone: 'UTC',
				pubsubTarget: {
					// Needs to be the real topic name
					// Must set up as a ref...
					topicName: `projects/${project}/topics/${schedule.target.id}`,
					data: Buffer.from(JSON.stringify(schedule.event)).toString('base64'),
				},
				schedule: schedule.expression,
			},
		},
	];

	return resources;
}

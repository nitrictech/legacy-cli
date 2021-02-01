import { NitricSchedule } from '@nitric/cli-common';

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

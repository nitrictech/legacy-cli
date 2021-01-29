import { NitricSchedule } from '@nitric/cli-common';

/**
 * Translate a NitricSchedule into a GCP Cloud Scheduler Deployment
 */
export default function (project: string, schedule: NitricSchedule, region: string): any[] {
	// const funcResourceName = `${sanitizeStringForDockerTag(func.name)}`;

	// Define function as the initial resources...
	const resources: any[] = [
		{
			// Define the function container here...
			// use our custom resource type provider...
			type: `${project}/nitric-cloud-schedule:projects.locations.jobs`,
			name: schedule.name,
			properties: {
        parent: `projects/${project}/locations/${region}`,
        // TODO: Potentially support other target types
        pubsubTarget: {
          // Needs to be the real topic name
          // Must set up as a ref...
          topicName: `$(ref.${schedule.target.name}.selfLink)` 
        },
        name: schedule.name,
        schedule: schedule.expression,
        // default is UTC
        // timeZone: "UTC"
			},
		},
	];

	return resources;
}
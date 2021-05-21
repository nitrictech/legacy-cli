import { NamedObject, NitricSchedule } from "@nitric/cli-common";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { NitricTopicPubsub } from "./topic";


interface NitricScheduleCloudSchedulerArgs {
	schedule: NamedObject<NitricSchedule>;
	topics: NitricTopicPubsub[];
}

/**
 * Nitric Schedule deployed to Google Cloud Scheduler
 */
export class NitricScheduleCloudScheduler extends pulumi.ComponentResource {

	public readonly job: gcp.cloudscheduler.Job;

	constructor(name: string, args: NitricScheduleCloudSchedulerArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:bucket:CloudStorage", name, {}, opts);
		const { schedule, topics } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const topic = topics.find((t) => t.name === schedule.target.id);

		if (topic) {
			this.job = new gcp.cloudscheduler.Job(schedule.name, {
				timeZone: 'UTC',
				description: `scheduled trigger for ${schedule.target.id}`,
				pubsubTarget: {
					topicName: topic.pubsub.name,
					data: Buffer.from(JSON.stringify(schedule.event)).toString('base64'),
				},
				schedule: schedule.expression,
			}, defaultResourceOptions);
		} else {
			throw new Error(`topic ${schedule.target.id} defined as target for schedule, but does not exist in the stack!`);
		}
		
		this.registerOutputs({
			job: this.job,
		});
	}
}
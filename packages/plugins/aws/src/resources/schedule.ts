import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { NamedObject, NitricSchedule } from "@nitric/cli-common";
import { NitricSnsTopic } from "./topic";

interface NitricScheduleEventBridgeArgs {
	schedule: NamedObject<NitricSchedule>;
	topics: NitricSnsTopic[];
};

/**
 * Nitric S3 Bucket based static site
 */
export class NitricScheduleEventBridge extends pulumi.ComponentResource {
	/**
	 * The name of the s3 site
	 */
	public readonly name: string;

	constructor(name, args: NitricScheduleEventBridgeArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:site:S3", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { schedule, topics } = args;

		const topic = topics.find(t => t.name === schedule.target.id);

		this.name = schedule.name;

		if (topic) {
			const rule = new aws.cloudwatch.EventRule(`${schedule.name}Schedule`, {
				description: `Nitric schedule trigger for ${schedule.name}`,
				name: schedule.name,
				scheduleExpression: `cron(${schedule.expression})`,
			}, defaultResourceOptions);
	
			new aws.cloudwatch.EventTarget(`${schedule.name}Target`, {
				arn: topic.sns.arn,
				rule: rule.arn,
			}, defaultResourceOptions);
		}

		this.registerOutputs({
			name: this.name,
		});
	}
}
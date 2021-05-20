import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { NamedObject, NitricTopic } from "@nitric/cli-common";

interface NitricSnsTopicArgs {
	topic: NamedObject<NitricTopic>;
}

export class NitricSnsTopic extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly sns: aws.sns.Topic;

	constructor(name, args: NitricSnsTopicArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:topic:SNS", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { topic: topicDef } = args;

		this.name = topicDef.name;
		this.sns = new aws.sns.Topic(
			topicDef.name, {
				name: topicDef.name,
			},
			defaultResourceOptions
		);

		// Finalize the deployment
		this.registerOutputs({
			sns: this.sns,
			name: this.name,
		});
	}
}
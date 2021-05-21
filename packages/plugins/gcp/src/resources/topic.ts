import { NamedObject, NitricTopic } from "@nitric/cli-common";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";


interface NitricTopicPubsubArgs {
	topic: NamedObject<NitricTopic>;
}

/**
 * Nitric Topic deployed to Google Cloud PubSub
 */
export class NitricTopicPubsub extends pulumi.ComponentResource {

	public readonly name: string;
	public readonly pubsub: gcp.pubsub.Topic;

	constructor(name: string, args: NitricTopicPubsubArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:topic:PubSub", name, {}, opts);
		const { topic } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = topic.name;

		// Deploy the service
		this.pubsub = new gcp.pubsub.Topic(topic.name, {
			name: topic.name,
		}, defaultResourceOptions);

		this.registerOutputs({
			name: this.name,
			pubsub: this.pubsub,
		});
	}
}
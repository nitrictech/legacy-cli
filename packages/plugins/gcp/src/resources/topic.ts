// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { NamedObject, NitricTopic } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';

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
		super('nitric:topic:PubSub', name, {}, opts);
		const { topic } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = topic.name;

		// Deploy the service
		this.pubsub = new gcp.pubsub.Topic(
			topic.name,
			{
				name: topic.name,
			},
			defaultResourceOptions,
		);

		this.registerOutputs({
			name: this.name,
			pubsub: this.pubsub,
		});
	}
}

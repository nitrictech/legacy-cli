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
import { NamedObject, NitricQueue } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';

interface NitricQueuePubsubArgs {
	queue: NamedObject<NitricQueue>;
}

/**
 * Nitric Topic deployed to Google Cloud PubSub
 */
export class NitricQueuePubsub extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly pubsub: gcp.pubsub.Topic;

	constructor(name: string, args: NitricQueuePubsubArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:queue:PubSub', name, {}, opts);
		const { queue } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		this.name = queue.name;

		// Deploy the func
		this.pubsub = new gcp.pubsub.Topic(
			queue.name,
			{
				name: queue.name,
			},
			defaultResourceOptions,
		);

		new gcp.pubsub.Subscription(`${queue.name}-sub`, {
			// XXX: Currently required relationship with pubsub queue plugin
			name: `${queue.name}-nitricqueue`,
			topic: this.pubsub.name,
		});

		this.registerOutputs({
			name: this.name,
			pubsub: this.pubsub,
		});
	}
}

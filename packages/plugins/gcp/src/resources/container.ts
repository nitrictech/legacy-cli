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
import { NitricContainerImage, Container } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import { NitricTopicPubsub } from './topic';

interface NitricContainerCloudRunArgs {
	container: Container;
	image: NitricContainerImage;
	location: string;
	topics: NitricTopicPubsub[];
}

/**
 * Nitric Custom Container deployed to Google Cloud Run
 */
export class NitricContainerCloudRun extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly cloudrun: gcp.cloudrun.Service;
	public readonly url: pulumi.Output<string>;

	constructor(name: string, args: NitricContainerCloudRunArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:func:CloudRun', name, {}, opts);
		const { container, image, location, topics } = args;
		const containerDescriptor = container.asNitricContainer();
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const { minScale = 0, maxScale = 10, triggers = {} } = containerDescriptor;

		this.name = container.getName();

		// Deploy the func
		this.cloudrun = new gcp.cloudrun.Service(
			container.getName(),
			{
				location,
				template: {
					metadata: {
						annotations: {
							'autoscaling.knative.dev/minScale': `${minScale}`,
							'autoscaling.knative.dev/maxScale': `${maxScale}`,
						},
					},
					spec: {
						containers: [
							{
								image: image.imageUri,
								ports: [
									{
										containerPort: 9001,
									},
								],
							},
						],
					},
				},
			},
			defaultResourceOptions,
		);

		this.url = this.cloudrun.statuses.apply((statuses) => statuses[0].url);

		// wire up its subscriptions
		if (triggers.topics && triggers.topics.length > 0) {
			// Create an account for invoking this func via subscriptions
			// TODO: Do we want to make this one account for subscription in future
			// TODO: We will likely configure this via eventarc in the future
			const invokerAccount = new gcp.serviceaccount.Account(`${container.getName()}-subacct`, {
				// accountId accepts a max of 30 chars, limit our generated name to this length
				accountId: `${name}-subacct`.substring(0, 30),
			});

			triggers.topics.forEach((sub) => {
				const topic = topics.find((t) => t.name === sub);
				if (topic) {
					new gcp.pubsub.Subscription(
						`${name}-${sub}-sub`,
						{
							topic: topic.pubsub.name,
							// This is a measure of how much processing time the task really gets for subscriptions
							// at the moment we rely on them returning to the membrane so it can return the status of the task processing
							// any 200 response will ack the message
							ackDeadlineSeconds: 0,
							retryPolicy: {
								// TODO: Make these properties configurable
								minimumBackoff: '15s',
								maximumBackoff: '600s',
							},
							pushConfig: {
								oidcToken: {
									serviceAccountEmail: invokerAccount.email,
								},
								// Assume the 0th status contains the URL of the func
								pushEndpoint: this.url,
							},
						},
						defaultResourceOptions,
					);
				} else {
					// TODO: Throw new error here about misconfiguration?
					// As we are unable to locate the topic
				}
			});
		}

		this.registerOutputs({
			name: this.name,
			url: this.url,
			cloudrun: this.cloudrun,
		});
	}
}

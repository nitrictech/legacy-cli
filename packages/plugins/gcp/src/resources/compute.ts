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

import { NitricContainerImage, StackContainer, StackFunction } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import { NitricTopicPubsub } from './topic';

interface NitricComputeCloudRunArgs {
	source: StackContainer | StackFunction;
	image: NitricContainerImage;
	location: string;
	topics: NitricTopicPubsub[];
}

/**
 * Nitric Function or Custom Container deployed to Google Cloud Run
 */
export class NitricComputeCloudRun extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly cloudrun: gcp.cloudrun.Service;
	public readonly url: pulumi.Output<string>;
	public readonly account: gcp.serviceaccount.Account;

	constructor(name: string, args: NitricComputeCloudRunArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:func:CloudRun', name, {}, opts);
		const { source, image, location, topics } = args;
		const { memory = 128 } = source.getDescriptor();
		const descriptor = source.getDescriptor();
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const { minScale = 0, maxScale = 10, triggers = {} } = descriptor;

		this.name = source.getName();

		// Create a service account for this cloud run instance
		this.account = new gcp.serviceaccount.Account(`${name}-acct`, {
			accountId: `${name}-acct`.substring(0, 30),
		});

		// Give project editor permissions
		// FIXME: Trim this down
		new gcp.projects.IAMMember(`${name}-editor`, {
			role: 'roles/editor',
			// Get the cloudrun service account email
			member: pulumi.interpolate`serviceAccount:${this.account.email}`,
		});

		// Give secret accessor permissions
		new gcp.projects.IAMMember(`${name}-secret-access`, {
			role: 'roles/secretmanager.secretAccessor',
			// Get the cloudrun service account email
			member: pulumi.interpolate`serviceAccount:${this.account.email}`,
		});

		// Deploy the func
		this.cloudrun = new gcp.cloudrun.Service(
			source.getName(),
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
						serviceAccountName: this.account.email,
						containers: [
							{
								image: image.imageUri,
								ports: [
									{
										containerPort: 9001,
									},
								],
								resources: {
									limits: {
										memory: `${memory}Mi`,
									},
								},
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
			const invokerAccount = new gcp.serviceaccount.Account(`${source.getName()}-subacct`, {
				// accountId accepts a max of 30 chars, limit our generated name to this length
				accountId: `${name}-subacct`.substring(0, 30),
			});

			// Apply permissions for the above account to the newly deployed cloud run service
			new gcp.cloudrun.IamMember(`${source.getName()}-subrole`, {
				member: pulumi.interpolate`serviceAccount:${invokerAccount.email}`,
				role: 'roles/run.invoker',
				service: this.cloudrun.name,
				location: this.cloudrun.location,
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

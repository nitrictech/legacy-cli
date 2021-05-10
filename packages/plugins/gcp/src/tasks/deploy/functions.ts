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

import { Service } from '@nitric/cli-common';
import { DeployedService, DeployedTopic } from '../types';
import { cloudrun, serviceaccount, pubsub } from '@pulumi/gcp';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';

/**
 * Create GCP CloudRun service to execute a Nitric Service
 * @param region to deploy the service into
 * @param service to be created and deployed
 * @param topics to subscribe this function to
 * @param authToken for GCR used to upload container image for the service
 * @param gcpProject to deploy the service into
 */
export function createFunction(
	region: string,
	service: Service,
	topics: DeployedTopic[],
	authToken: string,
	gcpProject: string,
): DeployedService {
	const serviceDescriptor = service.asNitricService();
	const { minScale = 0, maxScale = 10, triggers = {} } = serviceDescriptor;

	// build and push the image with docker
	const deployedImage = new docker.Image(`${service.getName()}-gcr-image`, {
		imageName: pulumi.interpolate`gcr.io/${gcpProject}/${service.getImageTagName()}`,
		build: {
			// Staging directory
			context: service.getStagingDirectory(),
			args: {
				PROVIDER: 'gcp',
			},
			// Create a reasonable shared memory space for image builds
			extraOptions: ['--shm-size', '1G'],
		},
		registry: {
			server: `https://gcr.io`,
			username: 'oauth2accesstoken',
			password: authToken,
		},
	});

	// Deploy the service
	const deployedFunction = new cloudrun.Service(service.getName(), {
		// project: project,
		location: region,
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
						image: deployedImage.imageName,
						ports: [
							{
								containerPort: 9001,
							},
						],
					},
				],
			},
		},
	});

	// wire up its subscriptions
	if (triggers.topics && triggers.topics.length > 0) {
		// Create an account for invoking this service via subscriptions
		// TODO: Do we want to make this one account for subscription in future
		// TODO: We will likely configure this via eventarc in the future
		const invokerAccount = new serviceaccount.Account(`${service.getName()}-subacct`, {
			// accountId accepts a max of 30 chars, limit our generated name to this length
			accountId: `${name}-subacct`.substring(0, 30),
		});

		triggers.topics.forEach((sub) => {
			const topic = topics.find((t) => t.name === sub);
			if (topic) {
				new pubsub.Subscription(`${name}-${sub}-sub`, {
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
						// Assume the 0th status contains the URL of the service
						pushEndpoint: deployedFunction.statuses.apply((statuses) => statuses[0].url),
					},
				});
			} else {
				// TODO: Throw new error here about misconfiguration?
				// As we are unable to locate the topic
			}
		});
	}

	// return the new function
	return {
		name: service.getName(),
		...service.asNitricService(),
		cloudRun: deployedFunction,
	};
}

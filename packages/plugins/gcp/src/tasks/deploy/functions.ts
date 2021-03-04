import { Function } from '@nitric/cli-common';
import { DeployedFunction, DeployedTopic } from '../types';
import { cloudrun, serviceaccount, pubsub } from '@pulumi/gcp';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';

export function createFunction(
	region: string,
	func: Function,
	topics: DeployedTopic[],
	authToken: string,
	gcpProject: string,
): DeployedFunction {
	const nitricFunc = func.asNitricFunction();
	const { name, minScale = 0, maxScale = 10, subs = [] } = nitricFunc;

	//const grcHost = getGcrHost(region);

	// build and push the image with docker
	const deployedImage = new docker.Image(`${name}-gcr-image`, {
		imageName: pulumi.interpolate`gcr.io/${gcpProject}/${func.getImageTagName()}`,
		build: {
			// Staging directory
			context: func.getStagingDirectory(),
			args: {
				PROVIDER: 'gcp',
			},
		},
		registry: {
			server: `https://gcr.io`,
			username: 'oauth2accesstoken',
			password: authToken,
		},
	});

	//deployedImage.registryServer

	// Deploy the function
	const deployedFunction = new cloudrun.Service(name, {
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
	if (subs && subs.length > 0) {
		// Create an account for invoking this function via subscriptions
		// TODO: Do we want to make this one account for subscription in future
		// TODO: We will likely configure this via eventarc in the future
		const invokerAccount = new serviceaccount.Account(`${name}-subscription-invoker`, {
			accountId: `${name}-subscription-invoker`,
		});

		subs.forEach((sub) => {
			const topic = topics.find((t) => t.name === sub.topic);
			if (topic) {
				new pubsub.Subscription(`${name}-${sub.topic}-subscription`, {
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
				// TODO: Throw new error here about misconfiguration???
				// As we are unable to locate the topic
			}
		});
	}

	// return the new function
	return {
		...func.asNitricFunction(),
		cloudRun: deployedFunction,
	};
}

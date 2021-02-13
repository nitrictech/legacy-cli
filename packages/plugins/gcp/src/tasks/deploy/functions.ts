import { NitricFunction, getTagNameForFunction } from '@nitric/cli-common';
import { getGcrHost } from './regions';
import { DeployedFunction, DeployedTopic } from './types';
import { cloudrun, serviceaccount, pubsub } from '@pulumi/gcp';

export function createFunction(
	project: string,
	stackName: string,
	region: string,
	func: NitricFunction,
	topics: DeployedTopic[],
): DeployedFunction {
	const { minScale = 0, maxScale = 10 } = func;

	const grcHost = getGcrHost(region);
	// Deploy the function
	const deployedFunction = new cloudrun.Service(func.name, {
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
						image: `${grcHost}/${project}/${getTagNameForFunction(stackName, 'gcp', func)}`,
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
	if (func.subs) {
		// Create an account for invoking this function via subscriptions
		// TODO: Do we want to make this one account for subscription in future
		// TODO: We will likely configure this via eventarc in the future
		const invokerAccount = new serviceaccount.Account(`${func.name}-subscription-invoker`, {
			accountId: `${func.name}-subscription-invoker`,
		});

		func.subs.forEach((sub) => {
			const topic = topics.find((t) => t.name === sub.topic);
			if (topic) {
				new pubsub.Subscription(`${func.name}-${sub.topic}-subscription`, {
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
		...func,
		cloudRun: deployedFunction,
	};
}

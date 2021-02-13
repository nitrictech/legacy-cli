import { NitricFunction, sanitizeStringForDockerTag, getTagNameForFunction } from '@nitric/cli-common';
import { getGcrHost } from './regions';
import { DeployedFunction, DeployedTopic } from './types';
import { cloudrun, serviceaccount, pubsub } from "@pulumi/gcp";

export function createFunction(project: string, stackName: string, region: string, func: NitricFunction, topics: DeployedTopic[]): DeployedFunction {
	const { minScale = 0, maxScale = 10 } = func;

	const grcHost = getGcrHost(region);
	// Deploy the function
	const deployedFunction = new cloudrun.Service(func.name, {
		location: "",
		template: {
			metadata: {
				annotations: {
					'autoscaling.knative.dev/minScale': `${minScale}`,
					'autoscaling.knative.dev/maxScale': `${maxScale}`,
				}
			},
			spec: {
				containers: [{
					image: `${grcHost}/${project}/${getTagNameForFunction(stackName, 'gcp', func)}`,
					ports: [{
						containerPort: 9001,
					}],
				}]
			}
		}
	});

	// wire up its subscriptions
	if (func.subs) {
		// Create an account for invoking this function via subscriptions
		// TODO: Do we want to make this one account for subscription in future
		// TODO: We will likely configure this via eventarc in the future
		const invokerAccount = new serviceaccount.Account(`${func.name}-subscription-invoker`, {
			accountId: `${func.name}-subscription-invoker`,
		});

		func.subs.forEach(sub => {
			const topic = topics.find(t => t.name === sub.topic);
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
						pushEndpoint: deployedFunction.statuses.apply(statuses => statuses[0].url)
					}
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


/**
 * Translate a NitricFunction into a GCP function deployment
 */
export default function (project: string, stackName: string, func: NitricFunction, region: string): any[] {
	const funcResourceName = `${sanitizeStringForDockerTag(func.name)}`;

	const grcHost = getGcrHost(region);

	// Use reasonable defaults
	const { minScale = 0, maxScale = 10, external } = func;

	const accessControl = external
		? {
				gcpIamPolicy: {
					bindings: [
						{
							role: 'roles/run.invoker',
							members: ['allUsers'],
						},
					],
				},
		  }
		: undefined;

	// Define function as the initial resources...
	const resources: any[] = [
		{
			// Define the function container here...
			// use our custom resource type provider...
			type: `${project}/nitric-cloud-run:projects.locations.services`,
			name: funcResourceName,
			properties: {
				parent: `projects/${project}/locations/${region}`,
				kind: 'Service',
				apiVersion: 'serving.knative.dev/v1',
				metadata: {
					name: sanitizeStringForDockerTag(func.name),
				},
				spec: {
					template: {
						metadata: {
							annotations: {
								// TODO: Add scaling options to functions scaling options
								// FIXME: Fix autoscaling keys
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
				},
			},
			accessControl,
		},
	];

	// FIXME: status does not appear to be available on the resource reference on creation
	// Define deploy time subscriptions here
	// if (func.subs) {
	//   resources = [
	//     ...resources,
	//     ...func.subs.map(sub => ({
	//       name: `${func.name} ${sub.topic} subscription`,
	//       type: 'gcp-types/pubsub-v1:projects.subscriptions',
	//       properties: {
	//         subscription: 'test',
	//         // TODO: Subscription must take the form of
	//         // subscription: '',
	//         pushConfig: {
	//           // TODO: Function resource reference here...
	//           pushEndpoint: `$(ref.${funcResourceName}.status.url)`
	//         },
	//         // TODO: Make this configurable by the user on their subscription
	//         // probably as some sort of retry deadline
	//         // XXX: 0 will set this to 10 seconds in pubsub which is their service level default
	//         ackDeadlineSeconds: 0,
	//         // TODO: Should turn this into a topic resource reference
	//         topic: `$(ref.${sub.topic}.name)`,
	//         metadata: {
	//           dependsOn: [
	//             // Depends on the topic resource
	//             sub.topic,
	//             // depend on the function we're creating
	//             funcResourceName,
	//           ]
	//         }
	//       }
	//     })),
	//   ]
	// }

	return resources;
}

export function generateFunctionOutputs(func: NitricFunction): { name: string; value: string }[] {
	return [
		{
			name: `${func.name} URL`,
			value: `$(ref.${sanitizeStringForDockerTag(func.name)})`,
		},
	];
}

import { NitricFunction, sanitizeStringForDockerTag, getTagNameForFunction } from '@nitric/cli-common';
import { getGcrHost } from './regions';

/**
 * Translate a NitricFunction into a GCP function deployment
 */
export default function (project: string, stackName: string, func: NitricFunction, region: string): any[] {
	const funcResourceName = `${sanitizeStringForDockerTag(func.name)}`;

	const grcHost = getGcrHost(region);

	// Use reasonable defaults
	const { minScale = 0, maxScale = 10 } = func;

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
									image: `${grcHost}/${project}/${getTagNameForFunction(stackName, func)}`,
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
			// FIXME: Make contingent on configuration
			accessControl: {
				gcpIamPolicy: {
					bindings: [
						{
							role: 'roles/run.invoker',
							members: ['allUsers'],
						},
					],
				},
			},
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

import { sanitizeStringForDockerTag } from '@nitric/cli-common';
import { DeployedFunction } from './types';

/**
 * Create deploy time subscription resources
 * FIXME: This should be created with initial deployment
 * However the status key on cloud run deployments is not immediately available so we need to wait to ensure
 * we can correctly configure topics to push to our cloud run subscribers
 */
export default function (project: string, func: DeployedFunction): any[] {
	let resources: any[] = [];

	if (func.subs) {
		// FIXME: Google doesn't tell you this but the pubsub service account needs token
		// creator permissions in order to successfully send message via an authenticated push subscription.
		// We'll need to figure out a way to enable this automatically...
		resources = [
			...resources,
			...func.subs.map((sub) => ({
				name: `${func.name} ${sub.topic} subscription`,
				type: 'gcp-types/pubsub-v1:projects.subscriptions',
				properties: {
					subscription: `${sanitizeStringForDockerTag(func.name)}-${sub.topic}`,
					// TODO: Subscription must take the form of
					// subscription: '',
					pushConfig: {
						oidcToken: {
							serviceAccountEmail: '$(ref.nitric-invoker.email)',
						},
						// TODO: Function resource reference here...
						// pushEndpoint: `$(ref.${funcResourceName}.status.url)`
						pushEndpoint: func.endpoint,
					},
					// TODO: Make this configurable by the user on their subscription
					// probably as some sort of retry deadline
					// XXX: 0 will set this to 10 seconds in pubsub which is their service level default
					ackDeadlineSeconds: 0,
					retryPolicy: {
						minimumBackoff: '15s',
						maximumBackoff: '600s',
					},
					// TODO: Should turn this into a topic resource reference
					topic: `projects/${project}/topics/${sub.topic}`,
				},
				metadata: {
					// Depends on the binding of a role to the service account that will act as the invoker for subscription
					// services
					dependsOn: ['bind-iam-policy'],
				},
			})),
		];
	}

	return resources;
}

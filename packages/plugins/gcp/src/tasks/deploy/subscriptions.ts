import { NitricFunction, sanitizeStringForDockerTag } from '@nitric/cli-common';
// import { google, run_v1 } from 'googleapis';
import { iam, pubsub, cloudrun, serviceaccount } from '@pulumi/gcp';

/**
 * Create deploy time subscription resources
 * FIXME: This should be created with initial deployment
 * However the status key on cloud run deployments is not immediately available so we need to wait to ensure
 * we can correctly configure topics to push to our cloud run subscribers
 * FIXME: Google doesn't tell you this but the pubsub service account needs token
 * creator permissions in order to successfully send message via an authenticated push subscription.
 * We'll need to figure out a way to enable this automatically...
 */
export default function (project: string, func: NitricFunction, service: cloudrun.Service): any {
	let resources = {};

	if (func.subs) {
		// FIXME: This will likely fail, may still have to deploy as seperate stack :(
		const url = service.statuses.apply((statuses) => {
			return statuses[0].url;
		});

		// Create a topic invoker for this function
		const functionServiceAccount = new serviceaccount.Account(`${func.name}-invoker`, {
			accountId: `${func.name}-invoker`,
		});

		new cloudrun.IamBinding(`${func.name}-invoker-binding`, {
			service: service.name,
			members: [`serviceAccount:${functionServiceAccount.email}`],
			role: 'roles/run.invoker',
		});

		const subscriptions = func.subs.map(
			(sub) =>
				new pubsub.Subscription(`${sub.topic}-${func.name}-subscription`, {
					topic: `projects/${project}/topics/${sub.topic}`,
					pushConfig: {
						oidcToken: {
							serviceAccountEmail: `${functionServiceAccount.email}`,
						},
						// TODO: Function resource reference here...
						// pushEndpoint: `$(ref.${funcResourceName}.status.url)`
						pushEndpoint: url,
					},
				}),
		);

		resources = {
			...resources,
			[`${func.name}-subscriptions`]: subscriptions,
		};
	}

	return resources;
}

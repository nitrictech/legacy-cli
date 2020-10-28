import { sanitizeStringForDockerTag } from '@nitric/cli-common';

/**
 * Create resources for an IAM account that has permission to invoke our run functions
 * XXX: Currently this is a single account for all internal subscriptions, however
 * we may want to do one account per function/service, or even on per subscription...
 */
export default function (project: string, stackName: string): any[] {
	const serviceAccount = `${sanitizeStringForDockerTag(stackName)}-invoker`;

	// Create as service account to be used by subscriptions
	return [
		{
			name: 'nitric-invoker',
			type: 'iam.v1.serviceAccount',
			properties: {
				accountId: serviceAccount,
				displayName: serviceAccount,
				projectId: project,
			},
		},
		{
			name: 'bind-iam-policy',
			type: 'gcp-types/cloudresourcemanager-v1:virtual.projects.iamMemberBinding',
			properties: {
				resource: project,
				role: 'roles/run.invoker',
				member: 'serviceAccount:$(ref.nitric-invoker.email)',
			},
			metadata: {
				dependsOn: ['nitric-invoker'],
			},
		},
	];

	//   {
	//     name: 'bind-iam-policy',
	//     type: 'gcp-types/cloudresourcemanager-v1:virtual.projects.iamMemberBinding',
	//     properties: {
	//       resource: project,
	//       role: 'roles/run.invoker',
	//       member: 'serviceAccount:$(ref.nitric-invoker.email)',
	//     },
	//     metadata: {
	//       dependsOn: ['get-iam-policy']
	//     }
	// }
	//   - name: get-iam-policy
	//   action: gcp-types/cloudresourcemanager-v1:cloudresourcemanager.projects.getIamPolicy
	//   properties:
	//     resource: {{ project }}
	//   metadata:
	//     runtimePolicy:
	//     - 'UPDATE_ALWAYS'

	// - name: patch-iam-policy
	//   action: gcp-types/cloudresourcemanager-v1:cloudresourcemanager.projects.setIamPolicy
	//   properties:
	//     resource: {{ project }}
	//     policy: $(ref.get-iam-policy)
	//     gcpIamPolicyPatch:
	//       add:
	//       - role: roles/owner
	//         members:
	//         - serviceAccount:$(ref.{{ deployment }}-svc-account.email)
}

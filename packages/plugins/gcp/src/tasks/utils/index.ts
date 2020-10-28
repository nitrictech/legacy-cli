import { deploymentmanager_v2beta, google } from 'googleapis';

export async function operationToPromise(
	project: string,
	operation: deploymentmanager_v2beta.Schema$Operation,
): Promise<void> {
	const auth = new google.auth.GoogleAuth({
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const authClient = await auth.getClient();

	const dmClient = new deploymentmanager_v2beta.Deploymentmanager({
		auth: authClient,
	});

	while (operation.progress! < 100) {
		// poll once every second
		await new Promise((resolve) => {
			setTimeout(resolve, 1000);
		});

		operation = (
			await dmClient.operations.get({
				project,
				operation: operation.name!,
			})
		).data;
	}
}

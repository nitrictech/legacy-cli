import { Command, flags } from '@oclif/command';
import { google } from 'googleapis';

export default class Token extends Command {
	static description = 'Deploy a Nitric application to Google Cloud Platform (GCP)';

	static examples = [`$ nitric deploy:gcp . -p my-gcp-project`];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	static args = [];

	async run(): Promise<void> {
		// const { args } = this.parse(Token);

		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/cloud-platform'],
		});
		const authClient = await auth.getClient();
		const token = await authClient.getAccessToken();
		console.log(token);
	}
}

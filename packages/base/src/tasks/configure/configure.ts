import { Task } from '@nitric/cli-common';
import { cli } from 'cli-ux';
import { writeFile, mkdirSync, existsSync } from 'fs';
import os from 'os';

type Cloud = 'aws' | 'azure' | 'gcp';

type ConfigureOptions = {
	[key in Cloud]: boolean;
};

type Credentials = {
	[key in Cloud]: Prompt;
};

type Prompt = Record<string, string>;

export class ConfigureTask extends Task<void> {
	static fileLocations = {
		aws: '/.aws/credentials',
		azure: process.env['AZURE_AUTH_LOCATION']
			? process.env['AZURE_AUTH_LOCATION']
			: os.homedir() + '/.azure/credentials.json',
		gcp: process.env['GOOGLE_APPLICATION_CREDENTIALS']
			? process.env['GOOGLE_APPLICATION_CREDENTIALS']
			: os.homedir() + '/.config/gcloud/application_default_credentials.json',
	};
	private setCreds: [Cloud, boolean][];

	constructor({ aws, azure, gcp }: ConfigureOptions) {
		super('Configuring credentials');
		this.setCreds = [
			['aws', aws],
			['azure', azure],
			['gcp', gcp],
		];
	}
	// Cloud provider: { Prompt Message : Associated environment variable}
	static credentials: Credentials = {
		aws: {
			'AWS Access Key ID': 'aws_access_key_id',
			'AWS Secret Access Key': 'aws_secret_access_key',
		},
		azure: {
			'Client ID': 'clientId',
			'Client Secret': 'clientSecret',
			'Subscription Id': 'subscriptionId',
			'Tenant Id': 'tenantId',
		},
		gcp: {
			'GCP ID': 'gcpId',
		},
	};

	async do(): Promise<void> {
		this.setCreds = this.setCreds.filter(([, set]) => set);
		//Iterate through the different clouds and putting all the prompts up
		for (const [cloud] of this.setCreds) {
			let creds: [string, string][] = [];
			for (const [promptMessage, envVar] of Object.entries(ConfigureTask.credentials[cloud])) {
				creds.push([envVar, await cli.prompt(promptMessage, { type: 'mask' })]);
			}
			const fileLocation = ConfigureTask.fileLocations[cloud];
			const folderLocation = fileLocation.split('/').slice(0, -1).join('/');
			if (!existsSync(folderLocation)) {
				mkdirSync(folderLocation);
			}
			if (cloud === 'aws') {
				const data = creds.reduce((prev, [env, cred]) => {
					return (prev += `${env}=${cred}\n`);
				}, '');
				writeFile(fileLocation, data, (err) => {
					if (err) throw err;
				});
			}
			if (cloud === 'gcp') {
				const credJSON = JSON.stringify(
					creds.reduce((prev, [env, cred]) => {
						prev[env] = cred;
						return prev;
					}, {}),
				);
				writeFile(fileLocation, credJSON, (err) => {
					if (err) throw err;
				});
			}
			if (cloud === 'azure') {
				const credJSON = JSON.stringify(
					creds.reduce((prev, [env, cred]) => {
						prev[env] = cred;
						return prev;
					}, {}),
				);
				writeFile(fileLocation, credJSON, (err) => {
					if (err) throw err;
				});
			}
		}
	}
}

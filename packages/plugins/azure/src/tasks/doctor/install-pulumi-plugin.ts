import { Task } from "@nitric/cli-common";
import execa from 'execa';

export class InstallPulumiPluginTask extends Task<void> {
	constructor() {
		super("Installing azure pulumi plugin");
	}
	
	async do(): Promise<void> {
		// Install the pulumi config
		execa.commandSync('pulumi plugin install resource azure v3.46.0');
	}
}
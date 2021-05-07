import { Command } from "@oclif/command";
import { AnalyticsClient } from "../analytics";
import { Preferences } from "../preferences";

export abstract class BaseCommand extends Command {
	
	async run(): Promise<any> {
		//const requiredInit = Preferences.requiresInit();

		await Preferences.initWorkflow();
		const analyticsClient = await AnalyticsClient.defaultAnalyticsClient();
		const cmd = analyticsClient.command(this.ctor.name);
		cmd.start();
		let results: any = undefined;
		try {
			//if (requiredInit) {
			console.log("Running:", this.ctor.name);
		  //}
			results = await this.do();
		} catch (e) {
			cmd.error(e, true);
		} finally {
			cmd.stop();
		}

		return results;
	}

	abstract do(): Promise<any>;
}
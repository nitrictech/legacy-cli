import { Command } from "@oclif/command";
import { AnalyticsClient } from "../analytics";
import { Preferences } from "../preferences";

export abstract class BaseCommand extends Command {
	
	async run(): Promise<void> {
		const requiredInit = Preferences.requiresInit();

		await Preferences.initWorkflow();
		const analyticsClient = await AnalyticsClient.defaultAnalyticsClient();
		const cmd = analyticsClient.command(this.ctor.name);
		cmd.start();
		try {
			if (requiredInit) {
				console.log("Running:", this.ctor.name);
		  }
			await this.do();
		} catch (e) {
			cmd.error(e, true);
		} finally {
			cmd.stop();
		}
	}

	abstract do(): Promise<void>;
}
import analytics, { Visitor } from "universal-analytics";
import { Preferences } from "../preferences";
import { CommandClient } from "./command-client";

/**
 * Client wrapper for use with universal analytics
 */
export class AnalyticsClient {
	private visitor?: Visitor;

	constructor(clientId?: string) {
		if (clientId) {
			this.visitor = analytics(
				"UA-196426669-2",
				clientId
			);
		}
	}

	// Open a new window for a user running a common
	command(name: string): CommandClient {
		return new CommandClient(name, this.visitor);
	}

	static async defaultAnalyticsClient(): Promise<AnalyticsClient> {
		// initialise preferences if these are required
		// await Preferences.initWorkflow();
		const preferences = await Preferences.fromDefault();
		return new AnalyticsClient(preferences.clientId);
	}
}


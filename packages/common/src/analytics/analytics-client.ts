import analytics, { Visitor } from "universal-analytics";
import { fileURLToPath } from "url";
import { CommandClient } from "./command-client";

/**
 * Client wrapper for use with universal analytics
 */
class AnalyticsClient {
	private visitor: Visitor

	constructor() {
		this.visitor = analytics(
			"our-account-id",
			// TODO: Need to retrieve or generate this somehow
			"unique-visitor-id"
		);
	}

	// Open a new window for a user running a common
	command(name: string): CommandClient {
		return new CommandClient("name", this.visitor);
	}
}


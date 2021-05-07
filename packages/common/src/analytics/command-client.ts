import { Visitor } from "universal-analytics";

/**
 * Command client for tracking
 */
export class CommandClient {
	private name: string;
	private visitor: Visitor;
	private startTime?: number;
	
	constructor(name: string, visitor: Visitor) {
		this.name = name;
		this.visitor = visitor;
	}

	/**
	 * Start the command
	 */
	start(): CommandClient {
		this.startTime = new Date().getTime();
		this.visitor.event(this.name, "start");
		return this;
	}

	

	/**
	 * Log an error for the command
	 * @param error
	 * @param fatal 
	 */
	error(error: Error, fatal: boolean): CommandClient {
		this.visitor.exception(error.stack || error.message, fatal)
		return this;
	}

	/**
	 * Stop the command
	 */
	async stop(): Promise<void> {
		if (!this.startTime) {
			throw new Error("Command client stopped without being started");
		}

		this.visitor.event(this.name, "stop");

		const runtime = new Date().getTime() - this.startTime;

		await new Promise<void>(res => {
			this.visitor.timing(this.name, "runtime", runtime).send(() => {
				res();
			});
		});
	}
}
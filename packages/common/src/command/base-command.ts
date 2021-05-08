import { Command, flags } from '@oclif/command';
import { AnalyticsClient } from '../analytics';
import { Preferences } from '../preferences';

export abstract class BaseCommand extends Command {
	static flags: flags.Input<{
		help: void;
	}> = {
		help: flags.help({ char: 'h' }),
	};

	//public args: {
	//	[name: string]: any;
	//} = {};

	//// NOTE: This should not be an issue
	//public flags: T = null as any;

	//async init(): Promise<void> {
	//	// do some initialization
	//	const { flags, args } = this.parse(this.ctor);
	//	this.flags = flags as T;
	//	this.args = args;
	//}

	async catch(err): Promise<any> {
		// add any custom logic to handle errors from the command
		// or simply return the parent class error handling
		return super.catch(err);
	}

	async finally(err): Promise<any> {
		// called after run and catch regardless of whether or not the command errored
		return super.finally(err);
	}

	async run(): Promise<any> {
		const requiredInit = Preferences.requiresInit();

		await Preferences.initWorkflow();
		const analyticsClient = await AnalyticsClient.defaultAnalyticsClient();
		const cmd = analyticsClient.command(this.ctor.name);
		cmd.start();
		let results: any = undefined;
		try {
			if (requiredInit) {
				console.log('Running:', this.ctor.name);
			}
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

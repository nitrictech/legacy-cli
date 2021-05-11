// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Command, flags } from '@oclif/command';
import { AnalyticsClient } from '../analytics';
import { Preferences } from '../preferences';
import { Config } from '../config';

/**
 * Base for all CLI Commands
 *
 * Ensure consistent implementation of analytics, CI operating mode, help flag and error handling.
 *
 * Note: Analytics only perform if/when user opts into analytics data collection.
 */
export abstract class BaseCommand extends Command {
	static flags: flags.Input<{
		help: void;
		ci: boolean;
	}> = {
		// Enable CI mode (non-interactive mode)
		ci: flags.boolean({
			default: false,
		}),
		help: flags.help({
			char: 'h',
			default: false,
		}),
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
		const {
			flags: { ci },
		} = this.parse(this.ctor);

		// Set global config CI mode the the provided ci flag...
		Config.get().ciMode = ci;

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
			await cmd.stop();
		}

		return results;
	}

	abstract do(): Promise<any>;
}

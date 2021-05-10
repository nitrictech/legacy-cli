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
import analytics, { Visitor } from 'universal-analytics';
import { Preferences } from '../preferences';
import { CommandClient } from './command-client';

/**
 * Client wrapper for use with universal analytics
 */
export class AnalyticsClient {
	private visitor?: Visitor;

	constructor(enabled: boolean, clientId?: string) {
		if (enabled && clientId) {
			// TODO: Replace with configuration and pull API key in remotely
			this.visitor = analytics('UA-196426669-2', clientId);
		}
	}

	// Open a new "window" for a user running a command
	command(name: string): CommandClient {
		return new CommandClient(name, this.visitor);
	}

	static async defaultAnalyticsClient(): Promise<AnalyticsClient> {
		// Load user preferences to determine if they have opted into analytics
		const preferences = await Preferences.fromDefault();
		return new AnalyticsClient(preferences.analyticsEnabled, preferences.clientId);
	}
}

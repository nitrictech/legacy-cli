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
import fs from 'fs';
import { PREFERENCES_FILE } from '../paths';
import { v4 } from 'uuid';
import YAML from 'yaml';
import inquirer from 'inquirer';
import { block } from '../utils';
import { Config } from '../config';

/**
 * Interface for structuring
 * CLI user preferences
 */
interface PreferenceData {
	clientId?: string;
	analyticsEnabled: boolean;
}

/**
 * Options for initializing user CLI preferences
 */
interface PreferenceInitOptions {
	analyticsOptIn: boolean;
}

const CI_DEFAULTS: PreferenceData = {
	analyticsEnabled: false,
};

/**
 * Model for managing user preference data for the Nitric CLI
 */
export class Preferences {
	private data: PreferenceData;

	constructor(data: PreferenceData) {
		this.data = data;
	}

	private get raw(): PreferenceData {
		return this.data;
	}

	/**
	 * Users client ID for analytics
	 */
	get clientId(): string | undefined {
		return this.data.clientId;
	}

	/**
	 * Users optin status for analytics collection
	 */
	get analyticsEnabled(): boolean {
		return this.data.analyticsEnabled;
	}

	/**
	 * Load preferences file from given location
	 */
	static async fromFile(file: string): Promise<Preferences> {
		const buff = await fs.promises.readFile(file);

		const data = YAML.parse(buff.toString()) as PreferenceData;
		return new Preferences(data);
	}

	static requiresInit(): boolean {
		// Skip preferences in CI mode
		// and user defaults
		if (Config.get().ciMode) {
			return false;
		}

		return !fs.existsSync(PREFERENCES_FILE);
	}

	/**
	 * Load the preferences file from default location
	 */
	static async fromDefault(): Promise<Preferences> {
		// Return defaults if CI is enabled...
		if (Config.get().ciMode) {
			return new Preferences(CI_DEFAULTS);
		}

		// Check if the file exists...
		if (!fs.existsSync(PREFERENCES_FILE)) {
			throw new Error('Preferences file not initialized!');
		}

		return await Preferences.fromFile(PREFERENCES_FILE);
	}

	static async writeToFile(file: string, preferences: Preferences): Promise<void> {
		await fs.promises.writeFile(file, YAML.stringify(preferences.raw));
	}

	/**
	 * Init workflow for the nitric CLI
	 * should always be run on first run (Preferences.requiresInit() == true)
	 */
	static async initWorkflow(): Promise<void> {
		if (Preferences.requiresInit()) {
			console.log(block`
			At Nitric we're striving to provide the best possible developer experience for all of our tools.
			To help us do this we'd like to collect anonymous analytics to help us track plugins & features used, issues and performance metrics.

			Note: this doesn't include any personal data, source code or other sensitive information about your projects.
		`);

			const { analyticsOptIn } = await inquirer.prompt([
				{
					name: 'analyticsOptIn',
					message: 'Enable Anonymous Analytics',
					type: 'confirm',
				},
			]);

			await Preferences.init({
				analyticsOptIn,
			});
		}
	}

	/**
	 * Initialize a new preferences file
	 */
	static async init({ analyticsOptIn }: PreferenceInitOptions): Promise<Preferences> {
		const data: PreferenceData = {
			clientId: v4(),
			analyticsEnabled: analyticsOptIn,
		};

		const preferences = new Preferences(data);

		await Preferences.writeToFile(PREFERENCES_FILE, preferences);

		return preferences;
	}
}

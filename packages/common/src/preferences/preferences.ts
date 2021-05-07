import fs from 'fs';
import { PREFERENCES_FILE } from '../paths';
import { v4 } from 'uuid';
import YAML from 'yaml';
import inquirer from 'inquirer';
import { block } from '../utils';

/**
 * Interface for structuring
 * CLI user preferences
 */
interface PreferenceData {
	clientId?: string;
}

/**
 * Options for initializing user CLI preferences
 */
interface PreferenceInitOptions {
	analyticsOptIn: boolean;
}

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
	 * A user with an undefined clientId
	 * Has opted out of analytics
	 */
	get clientId(): string | undefined {
		return this.data.clientId;
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
		return !fs.existsSync(PREFERENCES_FILE);
	}

	/**
	 * Load the preferences file from default location
	 */
	static async fromDefault(): Promise<Preferences> {
		// Check if the file exists...
		if (!fs.existsSync(PREFERENCES_FILE)) {
			throw new Error('Preferences file not initialized!');
		}

		return await this.fromFile(PREFERENCES_FILE);
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
		let clientId: string | undefined = undefined;
		if (analyticsOptIn) {
			// Generate a new clientId for this user
			clientId = v4();
		}

		const data: PreferenceData = {
			clientId,
		};

		const preferences = new Preferences(data);

		await Preferences.writeToFile(PREFERENCES_FILE, preferences);

		return preferences;
	}
}

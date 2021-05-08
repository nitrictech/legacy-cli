let config: Config | undefined;

export class Config {
	private _ciMode = false;

	set ciMode(mode: boolean) {
		this._ciMode = mode;
	}

	get ciMode(): boolean {
		return this._ciMode;
	}

	/**
	 * Returns a global single instance of CLI Runtime config
	 */
	static get(): Config {
		if (!config) {
			config = new Config();
		}

		return config;
	}
}

/**
 * Class representation of a nitric template
 */
export class Template {
	private name: string;
	private lang: string;
	// path relative to the parent repository
	private path: string;

	constructor(name: string, lang: string, path: string) {
		this.name = name;
		this.lang = lang;
		this.path = path;
	}

	getName(): string {
		return this.name;
	}

	getLang(): string {
		return this.lang;
	}

	getPath(): string {
		return this.path;
	}
}

import path from 'path';

/**
 * Class representation of a nitric template
 */
export class Template {
	private name: string;
	private lang: string;
	// Absolute path of this template
	private path: string;
	// path relative to the template directory
	private codePath?: string;

	constructor(name: string, lang: string, path: string, codePath?: string) {
		this.name = name;
		this.lang = lang;
		this.path = path;
		this.codePath = codePath;
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

	getCodePath(): string {
		const codePath = this.codePath || "./function";

		return path.join(this.path, codePath);
	}
}

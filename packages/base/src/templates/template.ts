/**
 * Class representation of a nitric template
 */
export class Template {
	private name: string;
	private lang: string;
	// path relative to the parent repository
	private path: string;
	private codeDir: string;

	constructor(name: string, lang: string, path: string, codeDir: string) {
		this.name = name;
		this.lang = lang;
		this.path = path;
		this.codeDir = codeDir;
	}
}

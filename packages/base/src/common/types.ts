export interface NitricTemplate {
	name: string;
	lang: string;
	path: string;
	// Relative to template path
	codeDir: string;
}

export interface NitricTemplateRepository {
	name: string;
	templates: NitricTemplate[];
}

export interface NitricRepository {
	location: string;
}

export interface NitricRepositories {
	[name: string]: NitricRepository;
}

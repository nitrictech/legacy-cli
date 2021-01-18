import fs from 'fs';
import { TEMPLATE_DIR, LOG_DIR, NITRIC_REPOSITORIES_FILE } from '../common/paths';
import path from 'path';
import { NitricRepositories, NitricTemplateRepository } from '../common/types';
import YAML from 'yaml';

/**
 * Returns if a given template exists
 * @param templateName structured as <repoName>:<templateName>
 */
export function isTemplateAvailable(templateName: string): boolean {
	try {
		const templateDirectory = getTemplateLocation(templateName);
		return fs.existsSync(templateDirectory);
	} catch (error) {
		return false;
	}
}

const DEFAULT_CODE_TEMPLATE_DIR = './function';

/**
 * Return the full path of a templates relative userland code directory
 * This will be used for creating new functions and projects
 * @param templateName
 */
export function getTemplateCodePath(templateName: string): string {
	const [repoName, tmplName] = templateName.split('/');
	const repoManifest = loadRepositoryManifest(repoName);

	const template = repoManifest.templates.find((template) => template.name === tmplName);

	if (!template) {
		throw new Error(`${templateName} does not exist in repository ${repoName}`);
	}

	const { codeDir = DEFAULT_CODE_TEMPLATE_DIR } = template;

	return path.join(`${TEMPLATE_DIR}/${repoName}`, template.path, codeDir);
}

/**
 * Return the full path of the given template
 * @param templateName structured as <repoName>/<templateName>
 */
export function getTemplateLocation(templateName: string): string {
	const [repoName, tmplName] = templateName.split('/');
	const repoManifest = loadRepositoryManifest(repoName);

	const template = repoManifest.templates.find((template) => template.name === tmplName);

	if (!template) {
		throw new Error(`${templateName} does not exist in repository ${repoName}`);
	}

	return path.join(`${TEMPLATE_DIR}/${repoName}`, template.path);
}

export function getAvailableRepositories(): string[][] {
	return fs
		.readdirSync(TEMPLATE_DIR, {
			withFileTypes: true,
		})
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => [dirent.name, `${TEMPLATE_DIR}/${dirent.name}/repository.yaml`]);
}

export function getAvailableTemplates(): string[] {
	try {
		// Read the metadata files of all the available templates
		const repositories = getAvailableRepositories();

		// Read each of the files and compile their list of templates...
		const templateRepositories = repositories.map((repo) => {
			const [name, metaFile] = repo;

			const tmp = YAML.parse(fs.readFileSync(metaFile).toString('utf-8')) as NitricTemplateRepository;

			return {
				...tmp,
				name,
			} as NitricTemplateRepository;
		});

		return templateRepositories.reduce((acc, repo) => {
			return [...acc, ...repo.templates.map((template) => `${repo.name}/${template.name}`)];
		}, [] as string[]);
	} catch (error) {
		return [];
	}
}

export function loadRepositoriesManifest(): NitricRepositories {
	if (fs.existsSync(NITRIC_REPOSITORIES_FILE)) {
		return YAML.parse(fs.readFileSync(NITRIC_REPOSITORIES_FILE).toString('utf-8')) as NitricRepositories;
	}

	throw new Error('Error loading the nitric repository manifest');
}

export function loadRepositoryManifest(repoName: string): NitricTemplateRepository {
	const repositoryManifestPath = path.join(TEMPLATE_DIR, `./${repoName}`, './repository.yaml');

	if (fs.existsSync(repositoryManifestPath)) {
		return YAML.parse(fs.readFileSync(repositoryManifestPath).toString('utf-8')) as NitricTemplateRepository;
	}

	throw new Error('Error loading the nitric repository manifest');
}

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export function functionLogFilePath(name: string): string {
	return path.join(LOG_DIR, `${name}.txt`);
}

import fs from 'fs';
import { TEMPLATE_DIR, LOG_DIR, NITRIC_STORE_DIR, NITRIC_REPOSITORIES_FILE } from '../common/paths';
import path from 'path';
import { NitricRepositories, NitricTemplateRepository } from '../common/types';
import YAML from "yaml";

/**
 * Checks if a specified template is available in the template install directory
 */
export function isTemplateAvailable(templateName: string): boolean {
	const templateDirectory = path.join(TEMPLATE_DIR, templateName);
	return fs.existsSync(templateDirectory);
}

export function getAvailableTemplates(): string[] {
	try {
		return fs
			.readdirSync(TEMPLATE_DIR, {
				withFileTypes: true,
			})
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);
	} catch (error) {
		return [];
	}
}

export function loadRepositoriesManifest(): NitricRepositories {
	if (fs.existsSync(NITRIC_REPOSITORIES_FILE)) {
		return YAML.parse(fs.readFileSync(NITRIC_REPOSITORIES_FILE).toString('utf-8')) as NitricRepositories;
	}

	throw new Error("Error loading the nitric repository manifest");
}

export function loadRepositoryManifest(repoName: string): NitricTemplateRepository {
	const repositoryManifestPath = path.join(TEMPLATE_DIR, `./${repoName}`, "./repository.yaml");

	if (fs.existsSync(repositoryManifestPath)) {
		return YAML.parse(fs.readFileSync(repositoryManifestPath).toString('utf-8')) as NitricTemplateRepository;
	}

	throw new Error("Error loading the nitric repository manifest");
}

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export function functionLogFilePath(name: string): string {
	return path.join(LOG_DIR, `${name}.txt`);
}

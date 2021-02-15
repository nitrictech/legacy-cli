import fs from 'fs';
import { TEMPLATE_DIR, LOG_DIR } from '../common/paths';
import path from 'path';
import { NitricTemplateRepository } from '../common/types';
import YAML from 'yaml';

export function loadRepositoryManifest(repoName: string): NitricTemplateRepository {
	const repositoryManifestPath = path.join(TEMPLATE_DIR, `./${repoName}`, './repository.yaml');

	if (fs.existsSync(repositoryManifestPath)) {
		return YAML.parse(fs.readFileSync(repositoryManifestPath).toString('utf-8')) as NitricTemplateRepository;
	}

	throw new Error('Error loading the nitric repository manifest');
}

export function getAvailableRepositories(): string[][] {
	return fs
		.readdirSync(TEMPLATE_DIR, {
			withFileTypes: true,
		})
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => [dirent.name, `${TEMPLATE_DIR}/${dirent.name}/repository.yaml`])
		.filter((repoTuple) => fs.existsSync(repoTuple[1]));
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

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export function functionLogFilePath(name: string): string {
	return path.join(LOG_DIR, `${name}.txt`);
}

import fs from 'fs';
import { TEMPLATE_DIR, LOG_DIR } from '../common/paths';
import path from 'path';

/**
 * Checks if a specified template is available in the template install directory
 */
export function isTemplateAvailable(templateName: string): boolean {
	const templateDirectory = path.join(TEMPLATE_DIR, templateName);
	return fs.existsSync(templateDirectory);
}

export function getAvailableTemplates(): string[] {
	return fs
		.readdirSync(TEMPLATE_DIR, {
			withFileTypes: true,
		})
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
}

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export function functionLogFilePath(name: string): string {
	return `${LOG_DIR}/${name}.txt`;
}

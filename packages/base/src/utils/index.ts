import fs from 'fs';
import { TEMPLATE_DIR } from '../common/paths';
import path from 'path';

/**
 * Checks if a specified template is available in the template install directory
 */
export function isTemplateAvailable(templateName: string): boolean {
	const templateDirectory = path.join(TEMPLATE_DIR, templateName);
	return fs.existsSync(templateDirectory);
}

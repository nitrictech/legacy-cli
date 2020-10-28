import fs from 'fs';
import { TEMPLATE_DIR } from '../common/paths';
import path from 'path';
import network from 'network';

export async function getLocalIp(): Promise<string> {
	return new Promise((resolve, reject) => {
		network.get_private_ip((error, ip) => {
			if (error) {
				reject(error);
			}
			resolve(ip);
		});
	});
}

/**
 * Checks if a specified template is available in the template install directory
 */
export function isTemplateAvailable(templateName: string): boolean {
	const templateDirectory = path.join(TEMPLATE_DIR, templateName);
	return fs.existsSync(templateDirectory);
}

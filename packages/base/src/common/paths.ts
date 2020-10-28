import * as os from 'os';
import * as path from 'path';

export const USER_HOME = os.homedir();
export const NITRIC_HOME = process.env.NITRIC_HOME || path.join(USER_HOME, '.nitric');
export const STAGING_DIR = path.join(NITRIC_HOME, 'staging');
export const TEMPLATE_DIR = path.join(NITRIC_HOME, 'templates');
export const LOG_DIR = path.join(NITRIC_HOME, 'logs');

const REL_FUNC_TEMPLATE_DIR = '/function';

/**
 * Given an template name, returns the path to that template's function template.
 * Used to generate new functions based on that template.
 * @param {string} template name of the template
 * @returns {string} the full template path
 */
export const templateFunctionPath = (template: string): string => {
	return path.join(TEMPLATE_DIR, template, REL_FUNC_TEMPLATE_DIR);
};

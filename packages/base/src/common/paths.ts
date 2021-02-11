import * as os from 'os';
import * as path from 'path';

export const USER_HOME = os.homedir();
export const NITRIC_HOME = process.env.NITRIC_HOME || path.join(USER_HOME, '.nitric');
export const STAGING_DIR = path.join(NITRIC_HOME, 'staging');
export const STAGING_API_DIR = path.join(STAGING_DIR, 'apis');
export const TEMPLATE_DIR = path.join(NITRIC_HOME, 'templates');
export const LOG_DIR = path.join(NITRIC_HOME, 'logs');

// Location of the nitric template store manifests
export const NITRIC_STORE_DIR = path.join(NITRIC_HOME, 'store');
export const NITRIC_REPOSITORIES_FILE = path.join(NITRIC_STORE_DIR, 'repositories.yaml');
export const NITRIC_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'official');

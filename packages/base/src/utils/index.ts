import fs from 'fs';
import { LOG_DIR } from '../common/paths';
import path from 'path';

export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

export function functionLogFilePath(name: string): string {
	return path.join(LOG_DIR, `${name}.txt`);
}

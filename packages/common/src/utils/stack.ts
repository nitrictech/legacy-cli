import fs from 'fs';
import path from 'path';
import { USER_HOME } from '../paths';

/**
 * Finds and reads the first matching file, if any, in the current directory, nearest ancestor, or user's home directory.
 * @param file
 * @param options
 */
export async function findFileRead(file: string, options = { encoding: 'utf-8', dir: process.cwd(), home: true }) {
	const { dir, encoding, home } = options;
	const dirArr = path.resolve(dir).split(path.sep);
	const homeFilePath = path.join(USER_HOME, file);
	let i = dirArr.length;
	let filePath: string;

	while (i--) {
		filePath = path.join(dirArr.join(path.sep), file);
		if (fs.existsSync(filePath)) {
			const content = await fs.promises.readFile(filePath, { encoding });
			return content.toString();
		}

		dirArr.pop();
	}

	// Check home directory if home option is true
	if (home && fs.existsSync(homeFilePath)) {
		const content = await fs.promises.readFile(homeFilePath, { encoding });
		return content.toString();
	}

	return null;
}

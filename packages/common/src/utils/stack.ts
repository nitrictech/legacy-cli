// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fs from 'fs';
import path from 'path';
import { USER_HOME } from '../paths';

/**
 * Finds and reads the first matching file, if any, in the current directory, nearest ancestor, or user's home directory.
 * @param file
 * @param options
 */
export async function findFileRead(
	file: string,
	options = { encoding: 'utf-8', dir: process.cwd(), home: true },
): Promise<{
	content: string;
	filePath: string;
} | null> {
	const { dir, encoding, home } = options;
	const dirArr = path.resolve(dir).split(path.sep);
	const homeFilePath = path.join(USER_HOME, file);
	let i = dirArr.length;
	let filePath: string;

	while (i--) {
		filePath = path.join(dirArr.join(path.sep), file);

		if (fs.existsSync(filePath)) {
			const content = await fs.promises.readFile(filePath, { encoding });
			return {
				content: content.toString(),
				filePath,
			};
		}

		dirArr.pop();
	}

	// Check home directory if home option is true
	if (home && fs.existsSync(homeFilePath)) {
		const content = await fs.promises.readFile(homeFilePath, { encoding });
		return {
			content: content.toString(),
			filePath: homeFilePath,
		};
	}

	return null;
}

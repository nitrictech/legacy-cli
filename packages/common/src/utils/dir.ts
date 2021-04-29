// Copyright 2021, Nitric Pty Ltd.
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

/**
 * crawlDirectory
 * Recursively crawls a directory tree and performs the given callback operation on every file in that tree
 * @param dir
 * @param f
 */
export async function crawlDirectory(dir: string, f: (_: string) => Promise<void>): Promise<void> {
	const files = await fs.promises.readdir(dir);
	for (const file of files) {
		const filePath = `${dir}/${file}`;
		const stat = await fs.promises.stat(filePath);
		if (stat.isDirectory()) {
			await crawlDirectory(filePath, f);
		}
		if (stat.isFile()) {
			await f(filePath);
		}
	}
}

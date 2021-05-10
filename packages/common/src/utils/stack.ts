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

import YAML from 'yaml';
import fs from 'fs';
import { NitricStack } from '../types';
import { Stack } from '../stack';
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

/**
 * Merges a YAML file and a YAML stringify string.
 * Prioritises updates from the comparison string.
 * @param file YAML file
 * @param comparisonString YAML stringify string
 * @returns a string with the differences between the file and string merged
 */
export function compareStackDifferences(
	stack: Stack,
	file: string,
	stringify: (obj: NitricStack) => string = YAML.stringify,
): string {
	function getComment(line: string): string {
		let indexOfComment = -1;
		do {
			line = line.substring(indexOfComment + 1);
			indexOfComment = line.indexOf('#');
		} while (line[indexOfComment - 1] !== ' ');
		return line.substring(indexOfComment);
	}
	let oldStack = fs
		.readFileSync(file, 'utf8')
		.split('\n') //Split it into a line by line
		.filter((value) => value !== ''); //Removes empty entries
	let updatedStack = stringify(stack.asNitricStack(true)).split('\n');
	let lineDifference = 0;
	let newStack: string[] = [];
	let endComment: string = oldStack.pop() || '';
	if (!endComment.trimLeft().startsWith('#')) {
		oldStack.push(endComment);
		endComment = '';
	}
	for (let i = 0; i < oldStack.length; i++) {
		let lineDiff = i - lineDifference;
		if (oldStack[i] !== updatedStack[lineDiff]) {
			//If the two lines are different
			if (oldStack[i].trimLeft().startsWith('#')) {
				//Whole line comment
				newStack.push(oldStack[i]);
				lineDifference++;
			} else if (oldStack[i].search(/#/) !== -1) {
				//Inline comment
				newStack.push(updatedStack[lineDiff] + ' ' + getComment(oldStack[i]));
			} else {
				newStack.push(updatedStack[lineDiff]);
			}
		} else {
			newStack.push(updatedStack[lineDiff]);
		}
	}
	//push the remainder of the new definition onto the yaml file
	for (let j = oldStack.length - lineDifference; j <= updatedStack.length; j++) {
		newStack.push(updatedStack[j]);
	}
	if (endComment !== '') {
		newStack.push(endComment);
	}
	return newStack.filter((value) => value !== '').join('\n');
}

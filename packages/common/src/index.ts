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

/**
 * Writes the given nitric stack to a descriptor file
 * @param nitricStack the stack to write out
 * @param nitricFile the YAML file to write to
 */
//export function writeNitricDescriptor(nitricStack: NitricStack, nitricFile = './nitric.yaml'): void {
//	fs.writeFileSync(nitricFile, YAML.stringify(nitricStack));
//}

// export function readNitricDescriptor(nitricFile = './nitric.yaml'): NitricStack {
// 	// Read the nitric file on the provided nitric file path
// 	return YAML.parse(fs.readFileSync(nitricFile).toString('utf-8')) as NitricStack;
// }

export function dockerodeEvtToString({ stream, progress, status, errorDetail }): string {
	if (errorDetail) {
		throw new Error(errorDetail.message);
	}
	if (status) {
		if (progress) {
			return `${status}: ${progress}`;
		} else {
			return `${status}`;
		}
	} else {
		return `${stream}`;
	}
}

export * from './command';
export * from './task';
export * from './types';
export * from './utils';
export * from './stack';
export * from './templates';
export * from './paths';
export * from './analytics';
export * from './config';
export * from './preferences';
export * from './resources';
export * as constants from './constants';

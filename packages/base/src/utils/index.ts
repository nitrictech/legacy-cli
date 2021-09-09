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
import { LOG_DIR } from '@nitric/cli-common';
import path from 'path';

/**
 * Creates the log output directory if it doesn't already exist
 */
export function createNitricLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR);
	}
}

/**
 * Provides a path that can be used for the logfile for a specific func/function
 * @param name of the func/function. This must be unique to ensure no collision with file paths.
 */
export function functionLogFilePath(name: string): string {
	return path.join(LOG_DIR, `${name}.txt`);
}

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

import { Task } from '@nitric/cli-common';
import execa from 'execa';

/**
 * Check for the Pulumi plugins required to deploy to AWS and prompt if missing.
 */
export class CheckPulumiPlugins extends Task<boolean> {
	constructor() {
		super('Checking For Pulumi AWS Plugin');
	}

	async do(): Promise<boolean> {
		try {
			const result = execa.commandSync('pulumi plugin ls');

			if (result.stdout.includes('aws')) {
				return true;
			}
		} catch (e) {
			throw new Error(
				'Pulumi is not installed or could not be executed, please run `nitric doctor` to install prerequisite software',
			);
		}

		return false;
	}
}

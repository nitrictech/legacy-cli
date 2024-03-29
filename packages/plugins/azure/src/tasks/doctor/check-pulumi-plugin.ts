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

export class CheckPulumiPluginTask extends Task<boolean> {
	constructor() {
		super('Checking azure-native pulumi plugin installation');
	}

	async do(): Promise<boolean> {
		// Perform the check
		try {
			const result = execa.commandSync('pulumi plugin ls');

			if (result.stdout.includes('azure-native')) {
				return true;
			}
		} catch (e) {
			throw new Error('Pulumi is not installed, please run nitric doctor to install pre-requisite software');
		}

		return false;
	}
}

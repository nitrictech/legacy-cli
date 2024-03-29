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

// pulumi plugin install resource aws v3.28.1
import execa from 'execa';
import { Task } from '@nitric/cli-common';

/**
 * Install the Pulumi AWS plugin
 */
export class InstallAWSPulumiPlugin extends Task<void> {
	constructor() {
		super('Installing Pulumi AWS plugin');
	}

	async do(): Promise<void> {
		execa.commandSync('pulumi plugin install resource aws v3.28.1');
	}
}

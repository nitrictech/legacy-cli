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

import { Task } from '@nitric/cli-common';
import execa from 'execa';
// import { oneLine } from "common-tags";
import os from 'os';
import stream from 'stream';

const UNIX_INSTALL = 'curl -fsSL https://get.docker.com | sh';

export const DOCKER_TASK_NAME = 'Installing Docker 🐋';

interface InstallDockerOptions {
	stdin: stream.Readable;
	stdout: stream.Writable;
}

/**
 * Installs Docker for the user
 */
export class InstallDocker extends Task<void> {
	private stdin: stream.Readable;
	private stdout: stream.Writable;

	constructor({ stdin, stdout }: InstallDockerOptions) {
		super(DOCKER_TASK_NAME);
		this.stdin = stdin;
		this.stdout = stdout;
	}

	async do(): Promise<void> {
		if (os.platform() == 'win32') {
			throw new Error('Windows not supported for automatic docker install');
		}

		try {
			this.update('Installing docker from https://get.docker.com');
			await execa.command(UNIX_INSTALL, { shell: true, stdin: this.stdin, stdout: this.stdout });
		} catch (e) {
			throw new Error(`Failed to install docker: ${e}`);
		}
	}
}

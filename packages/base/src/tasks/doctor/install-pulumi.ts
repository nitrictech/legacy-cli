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
import { oneLine } from 'common-tags';
import os from 'os';
import stream from 'stream';

const WIN32_INSTALL = oneLine`
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" 
  -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command 
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $version = '<version>'; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1')).Replace('\${latestVersion}', $version)" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin
`;

export const PULUMI_TASK_NAME = 'Installing Pulumi ☁️';

const UNIX_INSTALL = 'curl -sSL https://get.pulumi.com | sh';

interface InstallPulumiOptions {
	stdin: stream.Readable;
	stdout: stream.Writable;
}

/**
 * Installs Pulumi for the user
 */
export class InstallPulumi extends Task<void> {
	private stdin: stream.Readable;
	private stdout: stream.Writable;

	constructor({ stdin, stdout }: InstallPulumiOptions) {
		super(PULUMI_TASK_NAME);
		this.stdin = stdin;
		this.stdout = stdout;
	}

	async do(): Promise<void> {
		// Install pulumi
		const installCommand = os.platform() === 'win32' ? WIN32_INSTALL : UNIX_INSTALL;

		try {
			this.update('Installing pulumi from https://get.pulumi.com');
			await execa.command(installCommand, { shell: true, stdin: this.stdin, stdout: this.stdout });
		} catch (e) {
			throw new Error(`Failed to install pulumi: ${e}`);
		}
	}
}

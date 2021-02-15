import { Task } from '@nitric/cli-common';
import execa from 'execa';
// import { oneLine } from "common-tags";
import os from 'os';
import fs from 'fs';
import stream from 'stream';

// const WIN32_INSTALL = oneLine`
//   "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
//   -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command
//   "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $version = '<version>'; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1')).Replace('\${latestVersion}', $version)" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin
// `;

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
		// Install pulumi
		if (os.platform() == 'win32') {
			throw new Error('Windows not supported for automatic docker install');
		}

		// const updateStream = new stream.Writable()
		try {
			// updateStream.on('data', (data: string) => this.update.bind(this)(data));

			const process = execa.command(UNIX_INSTALL, { shell: true, stdin: this.stdin, stdout: this.stdout });
			await process;
		} catch (e) {
			throw new Error(`Failed to install docker: ${e}`);
		}
	}
}

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
			const process = execa.command(UNIX_INSTALL, { shell: true, stdin: this.stdin, stdout: this.stdout });
			await process;
		} catch (e) {
			throw new Error(`Failed to install docker: ${e}`);
		}
	}
}

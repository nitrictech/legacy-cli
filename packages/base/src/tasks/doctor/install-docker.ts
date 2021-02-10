import { Task } from "@nitric/cli-common";
import execa from "execa";
// import { oneLine } from "common-tags";
import os from "os"

// const WIN32_INSTALL = oneLine`
//   "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" 
//   -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command 
//   "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $version = '<version>'; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1')).Replace('\${latestVersion}', $version)" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin
// `;

const UNIX_INSTALL = "curl -fsSL https://get.docker.com | sh"

export const DOCKER_TASK_NAME = "Installing Docker 🐋";

/**
 * Installs Docker for the user
 */
export class InstallDocker extends Task<void> {
  constructor() {
    super(DOCKER_TASK_NAME);
  }

  async do() {
    // Install pulumi
    if (os.platform() == 'win32') {
      throw new Error('Windows not supported for automatic docker install')
    }

    try {
      await execa.command(UNIX_INSTALL, { shell: true });
    } catch (e) {
      throw new Error(`Failed to install pulumi: ${e}`);
    }
  }
}
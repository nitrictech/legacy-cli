import { Task } from "@nitric/cli-common";
import execa from "execa";
import { oneLine } from "common-tags";
import os from "os"

const WIN32_INSTALL = oneLine`
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" 
  -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command 
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $version = '<version>'; iex ((New-Object System.Net.WebClient).DownloadString('https://get.pulumi.com/install.ps1')).Replace('\${latestVersion}', $version)" && SET "PATH=%PATH%;%USERPROFILE%\.pulumi\bin
`;

export const PULUMI_TASK_NAME = "Installing Pulumi ☁️";

const UNIX_INSTALL = "curl -sSL https://get.pulumi.com | sh"

/**
 * Installs Pulumi for the user
 */
export class InstallPulumi extends Task<void> {
  constructor() {
    super(PULUMI_TASK_NAME);
  }

  async do() {
    // Install pulumi
    const installCommand = os.platform() === 'win32'
      ? WIN32_INSTALL
      : UNIX_INSTALL;

    try {
      await execa.command(installCommand, { shell: true });
    } catch (e) {
      throw new Error(`Failed to install pulumi: ${e}`);
    }
  }
}
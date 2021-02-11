// pulumi plugin install resource aws v3.28.1
import execa from "execa";
import { Task } from "@nitric/cli-common";


export const PLUGIN_CHECK_TASK_NAME = 'Checking For Pulumi AWS Plugin';

export class InstallAWSPulumiPlugin extends Task<void> {
  constructor() {
    super(PLUGIN_CHECK_TASK_NAME);
  }

  async do() {
    execa.commandSync('pulumi plugin install resource aws v3.28.1')
  }
}
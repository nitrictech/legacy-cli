// pulumi plugin install resource aws v3.28.1
import execa from "execa";
import { Task } from "@nitric/cli-common";

export class InstallGCPPulumiPlugin extends Task<void> {
  constructor() {
    super('Installing Pulumi GCP Plugin');
  }

  async do() {
    execa.commandSync('pulumi plugin install resource gcp v4.11.0')
  }
}
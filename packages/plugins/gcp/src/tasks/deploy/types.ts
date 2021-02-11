import { NitricFunction } from "@nitric/cli-common";

export interface DeployedFunction extends NitricFunction {
  endpoint: string;
}
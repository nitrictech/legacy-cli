import { NitricFunction } from "@nitric/cli-common";
import { lambda } from "@pulumi/aws";

export interface DeployedFunction extends NitricFunction {
  awsLambda: lambda.Function;
}
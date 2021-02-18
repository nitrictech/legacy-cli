import { NitricFunction } from "@nitric/cli-common";
import { appservice } from "@pulumi/azure";
import { Image } from "@pulumi/docker";

export interface DeployedFunctionImage extends NitricFunction {
	image: Image;
}

export interface DeployedFunction extends NitricFunction {
	appService: appservice.AppService;
}
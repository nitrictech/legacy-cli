import { NitricFunction } from '@nitric/cli-common';
import { web } from '@pulumi/azure-native';
import { Image } from '@pulumi/docker';

export interface DeployedFunctionImage extends NitricFunction {
	image: Image;
}

export interface DeployedFunction extends NitricFunction {
	appService: web.WebApp;
}

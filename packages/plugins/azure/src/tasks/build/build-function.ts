import { NitricFunction } from '@nitric/cli-common';
import { containerservice } from '@pulumi/azure';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';
import { DeployedFunctionImage } from '../types';

/**
 * Build and push a Nitric function container to the ACR
 */
export function buildAndPushFunction(registry: containerservice.Registry, func: NitricFunction): DeployedFunctionImage {
	const myImage = new docker.Image(`${func.name}-azure`, {
		imageName: pulumi.interpolate`${registry.loginServer}/${func.name}-azure:latest`,
		build: {
			// TODO: Prepare and stage files ready for building...
			// context: `./${customImage}`,
		},
		registry: {
			server: registry.loginServer,
			username: registry.adminUsername,
			password: registry.adminPassword,
		},
	});

	return {
		...func,
		image: myImage,
	};
}

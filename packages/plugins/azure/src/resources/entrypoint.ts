// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as pulumi from '@pulumi/pulumi';
import { NamedObject, NitricEntrypoint } from '@nitric/cli-common';
import { resources } from '@pulumi/azure-native';
import { NitricComputeAzureAppService, NitricAzureStorageSite, NitricApiAzureApiManagement } from '.';

interface NitricAzureStorageBucketArgs {
	entrypoint: NamedObject<NitricEntrypoint>;
	services: NitricComputeAzureAppService[];
	sites: NitricAzureStorageSite[];
	apis: NitricApiAzureApiManagement[];
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure Front Door based Entrypoing
 */
export class NitricEntrypointAzureFrontDoor extends pulumi.ComponentResource {
	public readonly name: string;
	// TODO: Create resource
	//public readonly frontdoor: network.FrontDoor;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricAzureStorageBucketArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:bucket:AzureStorage', name, {}, opts);
		// const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		// TODO: Implement entrypoint creation

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			name: this.name,
		});
	}
}

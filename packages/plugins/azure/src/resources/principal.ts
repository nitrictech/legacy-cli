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

import * as azuread from '@pulumi/azuread';
//import * as random from '@pulumi/random';
import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';

interface NitricAzureServicePrincipalArgs {
	resourceGroup: azure.resources.ResourceGroup;
}

/**
 * Nitric Azure Storage based Bucket
 */
export class NitricAzureServicePrincipal extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly servicePrincipalId: pulumi.Output<string>;
	public readonly resourceGroup: azure.resources.ResourceGroup;
	public readonly clientId: pulumi.Output<string>;
	public readonly tenantId: pulumi.Output<string>;
	public readonly clientSecret: pulumi.Output<string>;

	constructor(name: string, args: NitricAzureServicePrincipalArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:principal:AzureAD', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		// create an application per service principal
		const app = new azuread.Application(
			`${name}-app`,
			{
				displayName: `${name}-app`,
			},
			defaultResourceOptions,
		);

		this.clientId = app.applicationId;

		const sp = new azuread.ServicePrincipal(
			`${name}-sp`,
			{
				applicationId: app.applicationId,
			},
			defaultResourceOptions,
		);

		this.tenantId = sp.applicationTenantId;

		//const pwd = new random.RandomPassword(`${name}-pwd`, {
		//	length: 20,
		//	special: true,
		//});

		this.servicePrincipalId = sp.id;

		const spPwd = new azuread.ServicePrincipalPassword(
			`${name}-sppwd`,
			{
				servicePrincipalId: sp.id,
			},
			defaultResourceOptions,
		);

		this.clientSecret = spPwd.value;

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			clientId: this.clientId,
			tenantId: this.tenantId,
			clientSecret: this.clientSecret,
			servicePrincipalId: this.servicePrincipalId,
			name: this.name,
		});
	}
}

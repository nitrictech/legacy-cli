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
import { resources, documentdb } from '@pulumi/azure-native';

interface NitricDatabaseAccountMongoDBArgs {
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure CosmosDB based DatabaseAccount
 */
export class NitricDatabaseAccountMongoDB extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly account: documentdb.DatabaseAccount;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricDatabaseAccountMongoDBArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:database:Account', name, {}, opts);
		const { resourceGroup } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.account = new documentdb.DatabaseAccount(`${name}-db-account`, {
			resourceGroupName: resourceGroup.name,
			// 24 character limit
			accountName: `${name.replace(/-/g, '')}`,
			kind: 'MongoDB',
			apiProperties: {
				serverVersion: '4.0',
			},
			location: resourceGroup.location,
			databaseAccountOfferType: 'Standard',
			locations: [
				// what should we make these? TODO
				{
					failoverPriority: 0,
					isZoneRedundant: false,
					locationName: 'southcentralus',
				},
				{
					failoverPriority: 1,
					isZoneRedundant: false,
					locationName: 'eastus',
				},
			],
		});

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			account: this.account,
			name: this.name,
		});
	}
}

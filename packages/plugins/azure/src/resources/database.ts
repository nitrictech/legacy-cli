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

interface NitricDatabaseCosmosDBMongoArgs {
	account: documentdb.DatabaseAccount;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure CosmosDB based Database
 */
export class NitricDatabaseCosmosMongo extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly database: documentdb.MongoDBResourceMongoDBDatabase;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricDatabaseCosmosDBMongoArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:database:CosmosMongo', name, {}, opts);
		const { account, resourceGroup } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.database = new documentdb.MongoDBResourceMongoDBDatabase(name, {
			accountName: account.name,
			databaseName: name,
			location: resourceGroup.location,
			resource: {
				id: name,
			},
			resourceGroupName: resourceGroup.name,
		});

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			database: this.database,
			name: this.name,
		});
	}
}

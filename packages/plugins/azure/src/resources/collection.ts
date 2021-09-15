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
import { NamedObject, NitricCollection } from '@nitric/cli-common';
import { resources, documentdb } from '@pulumi/azure-native';

interface NitricCollectionCosmosDBMongoArgs {
	collection: NamedObject<NitricCollection>;
	account: documentdb.DatabaseAccount;
	database: documentdb.MongoDBResourceMongoDBDatabase;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric Azure CosmosDB based Collection
 */
export class NitricCollectionCosmosMongo extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly collection: documentdb.MongoDBResourceMongoDBCollection;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricCollectionCosmosDBMongoArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:collection:CosmosMongo', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { account, database, resourceGroup, collection } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		this.collection = new documentdb.MongoDBResourceMongoDBCollection(
			collection.name,
			{
				resourceGroupName: this.resourceGroup.name,
				accountName: account.name,
				databaseName: database.name,
				collectionName: collection.name,
				// TODO: ensure database location is set
				location: database.location as pulumi.Output<string>,
				options: {},
				resource: {
					id: collection.name,
					// _id index is created by default, add indexes here once we have them in stack
				},
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			collection: this.collection,
			name: this.name,
		});
	}
}

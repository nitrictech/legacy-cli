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
import { resources, documentdb } from '@pulumi/azure-native';

/**
 * Creates an Azure Cosmos DB MongoDB database
 * @param resourceGroup - The resource group to create this database in
 * @param databaseAccount - The Azure database account to deploy the database to
 */
export function createMongoDatabase(
	resourceGroup: resources.ResourceGroup,
	databaseAccount: documentdb.DatabaseAccount,
	databaseName: string,
): documentdb.MongoDBResourceMongoDBDatabase {
	return new documentdb.MongoDBResourceMongoDBDatabase(`${databaseName}-cosmos-mongodb-database`, {
		accountName: databaseAccount.name,
		databaseName,
		location: resourceGroup.location,
		resource: {
			id: databaseName,
		},
		resourceGroupName: resourceGroup.name,
	});
}

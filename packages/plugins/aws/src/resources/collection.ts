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
import * as aws from '@pulumi/aws';
import { NamedObject, NitricCollection } from '@nitric/cli-common';

interface NitricCollectionDynamoArgs {
	collection: NamedObject<NitricCollection>;
}

/**
 * Nitric Document Collection, using DynamoDB
 */
export class NitricCollectionDynamo extends pulumi.ComponentResource {
	/**
	 * The name of the document collection
	 */
	public readonly name: string;
	/**
	 * The deployed table
	 */
	public readonly dynamo: aws.dynamodb.Table;

	constructor(name, args: NitricCollectionDynamoArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:collection:DynamoDB', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { collection } = args;

		this.name = collection.name;

		// Create a DynamoDB Table to act as a Document Collection
		this.dynamo = new aws.dynamodb.Table(
			this.name,
			{
				attributes: [
					{
						name: '_pk',
						type: 'S',
					},
					{
						name: '_sk',
						type: 'S',
					},
				],
				hashKey: '_pk',
				rangeKey: '_sk',
				tags: {
					'x-nitric-name': this.name,
				},
				billingMode: 'PAY_PER_REQUEST',
			},
			defaultResourceOptions,
		);

		this.registerOutputs({
			name: this.name,
			dynamo: this.dynamo,
		});
	}
}

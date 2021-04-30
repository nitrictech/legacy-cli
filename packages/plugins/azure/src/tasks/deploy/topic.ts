// Copyright 2021, Nitric Pty Ltd.
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

import { NitricTopic } from '@nitric/cli-common';
import { resources, eventgrid } from '@pulumi/azure-native';
import { DeployedTopic } from '../types';
import * as pulumi from '@pulumi/pulumi';

// Create a topic on azure event grid
export function createTopic(resourceGroup: resources.ResourceGroup, topic: NitricTopic): DeployedTopic {
	const deployedTopic = new eventgrid.Topic(topic.name, {
		topicName: topic.name,
		resourceGroupName: resourceGroup.name,
	});

	// Get the shared access keys

	const sasKeys = pulumi.all([resourceGroup.name, topic.name]).apply(([resourceGroupName, topicName]) =>
		eventgrid.listTopicSharedAccessKeys({
			resourceGroupName,
			topicName,
		}),
	);

	const key1 = sasKeys.apply((k) => k.key1!);
	const key2 = sasKeys.apply((k) => k.key2!);

	return {
		...topic,
		eventGridTopic: deployedTopic,
		// Get the SAS keys for the topic
		// these will be used when connecting to logic apps for scheduling
		sasKeys: [key1, key2],
	};
}

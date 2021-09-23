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
import { NamedObject, NitricTopic } from '@nitric/cli-common';
import { resources, eventgrid } from '@pulumi/azure-native';

interface NitricEventgridTopicArgs {
	/**
	 * Nitric Topic Definition which defines how to create this Event Grid Topic
	 */
	topic: NamedObject<NitricTopic>;
	resourceGroup: resources.ResourceGroup;
}

/**
 * Nitric EventGrid based Topic
 */
export class NitricEventgridTopic extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly eventGridTopic: eventgrid.Topic;
	public readonly resourceGroup: resources.ResourceGroup;

	constructor(name: string, args: NitricEventgridTopicArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:topic:EventGrid', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup, topic } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;
		this.eventGridTopic = new eventgrid.Topic(
			topic.name,
			{
				topicName: topic.name,
				resourceGroupName: resourceGroup.name,
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			eventgrid: this.eventGridTopic,
			name: this.name,
		});
	}
}

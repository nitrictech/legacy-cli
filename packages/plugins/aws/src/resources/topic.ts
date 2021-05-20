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
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { NamedObject, NitricTopic } from "@nitric/cli-common";

interface NitricSnsTopicArgs {
	topic: NamedObject<NitricTopic>;
}

export class NitricSnsTopic extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly sns: aws.sns.Topic;

	constructor(name, args: NitricSnsTopicArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:topic:SNS", name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { topic: topicDef } = args;

		this.name = topicDef.name;
		this.sns = new aws.sns.Topic(
			topicDef.name, {
				name: topicDef.name,
			},
			defaultResourceOptions
		);

		// Finalize the deployment
		this.registerOutputs({
			sns: this.sns,
			name: this.name,
		});
	}
}
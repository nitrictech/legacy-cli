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
import { NamedObject, NitricQueue } from '@nitric/cli-common';
import * as aws from '@pulumi/aws';

interface NitricSQSQueueArgs {
	queue: NamedObject<NitricQueue>;
}

/**
 * Nitric AWS SQS Queue based Queue
 */

export class NitricSQSQueue extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly queue: aws.sqs.Queue;

	constructor(name: string, args: NitricSQSQueueArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:queue:SQSQueue', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { queue } = args;

		this.name = queue.name;
		this.queue = new aws.sqs.Queue(
			this.name,
			{
				tags: {
					'x-nitric-name': queue.name,
				},
			},
			defaultResourceOptions,
		);

		// Finalize the deployment
		this.registerOutputs({
			name: this.name,
			queue: this.queue,
		});
	}
}

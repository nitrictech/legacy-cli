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
import { NamedObject, NitricSchedule } from '@nitric/cli-common';
import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import { NitricTopicPubsub } from './topic';

interface NitricScheduleCloudSchedulerArgs {
	schedule: NamedObject<NitricSchedule>;
	topics: NitricTopicPubsub[];
}

/**
 * Nitric Schedule deployed to Google Cloud Scheduler
 */
export class NitricScheduleCloudScheduler extends pulumi.ComponentResource {
	public readonly job: gcp.cloudscheduler.Job;

	constructor(name: string, args: NitricScheduleCloudSchedulerArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:schedule:CloudScheduler', name, {}, opts);
		const { schedule, topics } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const topic = topics.find((t) => t.name === schedule.target.name);

		if (topic) {
			this.job = new gcp.cloudscheduler.Job(
				schedule.name,
				{
					timeZone: 'UTC',
					description: `scheduled trigger for ${schedule.target.name}`,
					pubsubTarget: {
						topicName: topic.pubsub.name,
						data: Buffer.from(JSON.stringify(schedule.event)).toString('base64'),
					},
					schedule: schedule.expression,
				},
				defaultResourceOptions,
			);
		} else {
			throw new Error(`topic ${schedule.target.name} defined as target for schedule, but does not exist in the stack!`);
		}

		this.registerOutputs({
			job: this.job,
		});
	}
}

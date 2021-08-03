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
import { NamedObject, NitricSchedule } from '@nitric/cli-common';
import { NitricSnsTopic } from './topic';

interface NitricScheduleEventBridgeArgs {
	schedule: NamedObject<NitricSchedule>;
	topics: NitricSnsTopic[];
}

/**
 * Nitric EventBridge based Schedule
 */
export class NitricScheduleEventBridge extends pulumi.ComponentResource {
	/**
	 * The name of the schedule
	 */
	public readonly name: string;

	constructor(name, args: NitricScheduleEventBridgeArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:schedule:EventBridge', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { schedule, topics } = args;

		const topic = topics.find((t) => t.name === schedule.target.id);

		this.name = schedule.name;

		if (topic) {
			const rule = new aws.cloudwatch.EventRule(
				`${schedule.name}Schedule`,
				{
					description: `Nitric schedule trigger for ${schedule.name}`,
					name: schedule.name,
					scheduleExpression: `cron(${schedule.expression})`,
				},
				defaultResourceOptions,
			);

			new aws.cloudwatch.EventTarget(
				`${schedule.name}Target`,
				{
					arn: topic.sns.arn,
					rule: rule.arn,
				},
				defaultResourceOptions,
			);
		}

		this.registerOutputs({
			name: this.name,
		});
	}
}

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

import { NitricSchedule } from '@nitric/cli-common';
import { DeployedTopic } from '../types';
import { cloudwatch } from '@pulumi/aws';

export function createSchedule(schedule: NitricSchedule, topics: DeployedTopic[]): void {
	const targetTopic = topics.find((t) => t.name === schedule.target.id);

	if (targetTopic) {
		const rule = new cloudwatch.EventRule(`${schedule.name}Schedule`, {
			description: `Nitric schedule trigger for ${schedule.name}`,
			name: schedule.name,
			scheduleExpression: `cron(${schedule.expression})`,
		});

		new cloudwatch.EventTarget(`${schedule.name}Target`, {
			arn: targetTopic.awsTopic.arn,
			rule: rule.arn,
		});
	}
}

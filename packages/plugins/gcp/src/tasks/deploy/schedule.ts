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

import { NitricSchedule, NamedObject } from '@nitric/cli-common';
import { cloudscheduler } from '@pulumi/gcp';
import { DeployedSchedule, DeployedTopic } from '../types';

export function createSchedule(schedule: NamedObject<NitricSchedule>, topics: DeployedTopic[]): DeployedSchedule {
	// Find our target topic

	// Currently we only support topic targets for schedules
	const topic = topics.find((t) => t.name === schedule.target.id);

	if (topic) {
		const job = new cloudscheduler.Job(schedule.name, {
			timeZone: 'UTC',
			description: `scheduled trigger for ${schedule.target.id}`,
			pubsubTarget: {
				topicName: topic.pubsub.name,
				data: Buffer.from(JSON.stringify(schedule.event)).toString('base64'),
			},
			schedule: schedule.expression,
		});

		return {
			...schedule,
			job,
		};
	}

	throw new Error(`Miconfiguration error ${schedule.target.id} does not exist in stack`);
}

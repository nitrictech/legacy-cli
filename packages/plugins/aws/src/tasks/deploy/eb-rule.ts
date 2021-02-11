import { NitricSchedule } from '@nitric/cli-common';
import { DeployedTopic } from "../types";
import { cloudwatch } from "@pulumi/aws";

export function createSchedule(schedule: NitricSchedule, topics: DeployedTopic[]): void {
	const targetTopic = topics.find(t => t.name === schedule.target.id);

	if (targetTopic) {
		const rule = new cloudwatch.EventRule(`${schedule.name}Schedule`, {
			description: `Nitric schedule trigger for ${schedule.name}`,
			name: schedule.name,
			scheduleExpression: `cron(${schedule.expression})`,
		});
	
		new cloudwatch.EventTarget(`${schedule.name}Target`, {
			arn: targetTopic.awsTopic.arn,
			rule: rule.arn
		});
	}
}

// Creates a new event bridge rule for the default stack event bridge for a given NitricSchedule
export default function (schedule: NitricSchedule): Record<string, any> {
	// FIXME: Need to set these as constants with normalisation...
	// TODO: Need to add support for additional target types
	const targetDefName = `${schedule.target.id}TopicDef`;
	const scheduleDefName = `${schedule.name}ScheduleDef`;

	return {
		[scheduleDefName]: {
			Type: 'AWS::Events::Rule',
			Properties: {
				Description: `Nitric schedule trigger for ${schedule.name}`,
				Name: schedule.name,
				ScheduleExpression: `cron(${schedule.expression})`,
				State: 'ENABLED',
				Targets: [
					{
						// Name the schedule target here...
						Arn: {
							Ref: targetDefName,
						},
						Id: schedule.name,
						Input: JSON.stringify(schedule.event),
					},
				],
			},
		},
	};
}

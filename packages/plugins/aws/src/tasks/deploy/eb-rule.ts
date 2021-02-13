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

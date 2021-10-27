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
 * Converts a standard Crontab style cron expression to an AWS specific format.
 *
 * AWS appears to use a variation of the Quartz "Unix-like" Cron Expression Format.
 * Notable changes include:
 * - Removing the 'seconds' value (seconds are not supported)
 * - Making the 'year' value mandatory
 * - Providing a value for both Day of Month and Day of Year is not supported.
 *
 * Quartz CronExpression Docs:
 * https://www.javadoc.io/doc/org.quartz-scheduler/quartz/1.8.2/org/quartz/CronExpression.html
 *
 * AWS Specific CronExpressions Doc:
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions
 *
 * Crontab Expression Docs:
 * https://man7.org/linux/man-pages/man5/crontab.5.html
 *
 * @param crontab the crontab style cron expression string
 * @returns the input cron expression returned in the AWS specific format
 */
export const cronToAwsCron = (crontab: string): string => {
	let parts = crontab.split(' ');
	if (parts.length !== 5) {
		throw new Error(`Invalid Expression. Expected 5 expression values, received ${parts.length}`);
	}

	// Replace */x (i.e. "every x minutes") style inputs to the AWS equivalent
	// AWS uses 0 instead of * for these expressions
	parts = parts.map((part) => part.replace(/^\*(?=\/.*)/g, '0'));

	// Only day of week or day of month can be set with AWS, the other must be a ? char
	// See: https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions - Restrictions
	const DAY_OF_MONTH = 2;
	const DAY_OF_WEEK = 4;
	if (parts[DAY_OF_WEEK] === '*') {
		parts[DAY_OF_WEEK] = '?';
	} else {
		if (parts[DAY_OF_MONTH] !== '*') {
			// TODO: We can support both in future by creating two EventRules - one for DOW, another for DOM.
			throw new Error('Invalid Expression. Day of Month and Day of Week expression component cannot both be set.');
		}
		parts[DAY_OF_MONTH] = '?';
	}

	// We also need to adjust the Day of Week value
	// crontab uses 0-7 (0 or 7 is Sunday)
	// AWS uses 1-7 (Sunday-Saturday)
	parts[DAY_OF_WEEK] = parts[DAY_OF_WEEK].split('')
		.map((char) => {
			let num = parseInt(char);

			if (!isNaN(num)) {
				// Check for standard 0-6 day range and increment
				if (num >= 0 && num <= 6) {
					return num + 1;
				} else {
					// otherwise default to Sunday
					return 1;
				}
			} else {
				return char;
			}
		})
		.join('');

	// Add the year component, this doesn't exist in crontab expressions, so we default it to *
	parts = [...parts, '*'];
	return parts.join(' ');
};

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

		const topic = topics.find((t) => t.name === schedule.target.name);

		this.name = schedule.name;

		let awsCronValue = '';
		try {
			awsCronValue = cronToAwsCron(schedule.expression?.replace(/['"]+/g, ''));
		} catch (error) {
			throw new Error(`Failed to process expression for schedule ${this.name}. Details: ${(error as Error).message}`);
		}

		if (topic) {
			const rule = new aws.cloudwatch.EventRule(
				`${schedule.name}Schedule`,
				{
					description: `Nitric schedule trigger for ${schedule.name}`,
					name: schedule.name,
					scheduleExpression: `cron(${awsCronValue})`,
				},
				defaultResourceOptions,
			);

			new aws.cloudwatch.EventTarget(
				`${schedule.name}Target`,
				{
					arn: topic.sns.arn,
					rule: rule.name,
				},
				defaultResourceOptions,
			);
		}

		this.registerOutputs({
			name: this.name,
		});
	}
}

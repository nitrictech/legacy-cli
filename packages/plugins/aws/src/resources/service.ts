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
import { Service, NitricServiceImage } from '@nitric/cli-common';
import { NitricSnsTopic } from './topic';

interface NitricServiceAwsLambdaArgs {
	/**
	 * Nitric Service
	 */
	service: Service;

	/**
	 * A deployed Nitric Image
	 */
	image: NitricServiceImage;

	/**
	 * Deployed Nitric Service Topics
	 */
	topics: NitricSnsTopic[];

	/**
	 * The amount of provisioned memory
	 * defaults to 128
	 */
	memory?: pulumi.Input<number>;

	/**
	 * The timeout for the service in seconds
	 * defaults to 15
	 */
	timeout?: pulumi.Input<number>;
}

/**
 * AWS Lambda implementation of a nitric service
 */
export class NitricServiceAWSLambda extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly lambda: aws.lambda.Function;

	constructor(name, args: NitricServiceAwsLambdaArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:service:AWSLambda', name, {}, opts);

		const { service, image, topics, timeout = 15, memory = 128 } = args;
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const descriptor = service.asNitricService();

		this.name = service.getName();

		const lambdaRole = new aws.iam.Role(
			`${service.getName()}LambdaRole`,
			{
				assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.LambdaPrincipal),
			},
			defaultResourceOptions,
		);

		new aws.iam.RolePolicyAttachment(
			`${service.getName()}LambdaBasicExecution`,
			{
				policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
				role: lambdaRole.id,
			},
			defaultResourceOptions,
		);

		// TODO: Lock this SNS topics for which this function has pub definitions
		new aws.iam.RolePolicy(
			`${service.getName()}SNSAccess`,
			{
				role: lambdaRole.id,
				policy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: [
								'sns:Publish',
								'sns:GetTopicAttributes',
								'sns:Subscribe',
								'sns:ConfirmSubscription',
								'sns:ListTopics',
								'sns:Unsubscribe',
							],
							Resource: '*',
						},
					],
				}),
			},
			defaultResourceOptions,
		);

		new aws.iam.RolePolicy(
			`${service.getName()}DynamoDBAccess`,
			{
				role: lambdaRole.id,
				policy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: [
								'dynamodb:CreateTable',
								'dynamodb:BatchGetItem',
								'dynamodb:BatchWriteItem',
								'dynamodb:PutItem',
								'dynamodb:DescribeTable',
								'dynamodb:DeleteItem',
								'dynamodb:GetItem',
								'dynamodb:Query',
								'dynamodb:UpdateItem',
								'dynamodb:UpdateTable',
								'dynamodb:ListTables',
							],
							Resource: '*',
						},
					],
				}),
			},
			defaultResourceOptions,
		);

		this.lambda = new aws.lambda.Function(
			service.getName(),
			{
				imageUri: image.imageUri, // generateEcrRepositoryUri(account, region, stackName, func) + ':latest',
				memorySize: memory,
				timeout,
				packageType: 'Image',
				role: lambdaRole.arn,
			},
			defaultResourceOptions,
		);

		const { triggers = {} } = descriptor;

		(triggers.topics || []).forEach((triggerTopic) => {
			const topic = topics.find((t) => t.name === triggerTopic);

			// Only apply if the topic exists
			if (topic) {
				new aws.lambda.Permission(
					`${service.getName()}${triggerTopic}Permission`,
					{
						sourceArn: topic.sns.arn,
						function: this.lambda,
						principal: 'sns.amazonaws.com',
						action: 'lambda:InvokeFunction',
					},
					defaultResourceOptions,
				);

				new aws.sns.TopicSubscription(
					`${service.getName()}${triggerTopic}Subscription`,
					{
						endpoint: this.lambda.arn,
						protocol: 'lambda',
						topic: topic.sns,
					},
					defaultResourceOptions,
				);
			}
			// TODO: Should we throw a misconfiguration error in the case
			// where the topic does not exist
		});

		this.registerOutputs({
			lambda: this.lambda,
			name: this.name,
		});
	}
}

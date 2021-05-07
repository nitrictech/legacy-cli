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

import { Service } from '@nitric/cli-common';
import { lambda, iam, sns, ecr } from '@pulumi/aws';
import { DeployedTopic, DeployedService } from '../types';
import * as docker from '@pulumi/docker';

// Creates a Lambda Function using pulumi
export function createLambdaFunction(
	service: Service,
	topics: DeployedTopic[],
	token: ecr.GetAuthorizationTokenResult,
): DeployedService {
	const nitricFunc = service.asNitricService();
	// Ensure an image repository is available
	const repository = new ecr.Repository(service.getImageTagName());

	const image = new docker.Image(`${service.getImageTagName()}-image`, {
		imageName: repository.repositoryUrl,
		build: {
			// Staging directory
			context: service.getStagingDirectory(),
			args: {
				PROVIDER: 'aws',
			},
			// Create a reasonable shared memory space for image builds
			extraOptions: ['--shm-size', '1G'],
		},
		registry: {
			server: token.proxyEndpoint,
			username: token.userName,
			password: token.password,
		},
	});
	// repository.repositoryUrl
	// Build and deploy container

	const lambdaRole = new iam.Role(`${service.getName()}LambdaRole`, {
		assumeRolePolicy: iam.assumeRolePolicyForPrincipal(iam.Principals.LambdaPrincipal),
	});

	new iam.RolePolicyAttachment(`${service.getName()}LambdaBasicExecution`, {
		policyArn: iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
		role: lambdaRole.id,
	});

	// TODO: Lock this SNS topics for which this function has pub definitions
	new iam.RolePolicy(`${service.getName()}SNSAccess`, {
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
	});

	new iam.RolePolicy(`${service.getName()}DynamoDBAccess`, {
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
	});

	const lfunction = new lambda.Function(service.getName(), {
		imageUri: image.imageName, // generateEcrRepositoryUri(account, region, stackName, func) + ':latest',
		memorySize: 128,
		timeout: 15,
		packageType: 'Image',
		role: lambdaRole.arn,
	});

	const { triggers = {} } = nitricFunc;

	(triggers.topics || []).forEach((triggerTopic) => {
		const topic = topics.find((t) => t.name === triggerTopic);

		// Only apply if the topic exists
		if (topic) {
			new lambda.Permission(`${service.getName()}${triggerTopic}Permission`, {
				sourceArn: topic.awsTopic.arn,
				function: lfunction,
				principal: 'sns.amazonaws.com',
				action: 'lambda:InvokeFunction',
			});

			new sns.TopicSubscription(`${service.getName()}${triggerTopic}Subscription`, {
				endpoint: lfunction.arn,
				protocol: 'lambda',
				topic: topic.awsTopic,
			});
		}
		// TODO: Should we throw a mis configuration error in the case
		// where the topic does not exist
	});

	return {
		...nitricFunc,
		name: service.getName(),
		awsLambda: lfunction,
	};
}

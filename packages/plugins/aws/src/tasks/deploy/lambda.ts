import { generateEcrRepositoryUri } from '../../common/utils';
import { NitricFunction, normalizeFunctionName, normalizeTopicName } from '@nitric/cli-common';
import { lambda, iam, sns } from '@pulumi/aws';
import { DeployedTopic, DeployedFunction } from '../types';

// Creates a Lambda Function using pulumi
export function createLambdaFunction(
	stackName: string,
	func: NitricFunction,
	topics: DeployedTopic[],
	account: string,
	region: string,
): DeployedFunction {
	const lambdaRole = new iam.Role(`${func.name}LambdaRole`, {
		assumeRolePolicy: iam.assumeRolePolicyForPrincipal(iam.Principals.LambdaPrincipal),
	});

	new iam.RolePolicyAttachment(`${func.name}LambdaBasicExecution`, {
		policyArn: iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
		role: lambdaRole.id,
	});

	// TODO: Lock this SNS topics for which this function has pub definitions
	new iam.RolePolicy(`${func.name}SNSAccess`, {
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

	new iam.RolePolicy(`${func.name}DynamoDBAccess`, {
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

	const lfunction = new lambda.Function(func.name, {
		imageUri: generateEcrRepositoryUri(account, region, stackName, func) + ':latest',
		memorySize: 128,
		timeout: 15,
		packageType: 'Image',
		role: lambdaRole.arn,
	});

	func.subs?.forEach((sub) => {
		const topic = topics.find((t) => t.name === sub.topic);

		// Only apply if the topic exists
		if (topic) {
			new lambda.Permission(`${func.name}${sub.topic}Permission`, {
				sourceArn: topic.awsTopic.arn,
				function: lfunction,
				principal: 'sns.amazonaws.com',
				action: 'lambda:InvokeFunction',
			});

			new sns.TopicSubscription(`${func.name}${sub.topic}Subscription`, {
				endpoint: lfunction.arn,
				protocol: 'lambda',
				topic: topic.awsTopic,
			});
		}
		// TODO: Should we throw a mis configuration error in the case
		// where the topic does not exist
	});

	return {
		...func,
		awsLambda: lfunction,
	};
}

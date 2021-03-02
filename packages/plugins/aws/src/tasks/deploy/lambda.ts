import { Function } from '@nitric/cli-common';
import { lambda, iam, sns, ecr } from '@pulumi/aws';
import { DeployedTopic, DeployedFunction } from '../types';
import * as docker from '@pulumi/docker';

// Creates a Lambda Function using pulumi
export function createLambdaFunction(
	func: Function,
	topics: DeployedTopic[],
	token: ecr.GetAuthorizationTokenResult,
): DeployedFunction {
	const nitricFunc = func.asNitricFunction();
	// Ensure an image repository is available
	const repository = new ecr.Repository(func.getImageTagName());

	const image = new docker.Image(`${func.getImageTagName()}-image`, {
		imageName: repository.repositoryUrl,
		build: {
			// Staging directory
			context: func.getStagingDirectory(),
			args: {
				PROVIDER: 'aws',
			},
		},
		registry: {
			server: token.proxyEndpoint,
			username: token.userName,
			password: token.password,
		},
	});
	//repository.repositoryUrl
	// Build and deploy container

	const lambdaRole = new iam.Role(`${nitricFunc.name}LambdaRole`, {
		assumeRolePolicy: iam.assumeRolePolicyForPrincipal(iam.Principals.LambdaPrincipal),
	});

	new iam.RolePolicyAttachment(`${nitricFunc.name}LambdaBasicExecution`, {
		policyArn: iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
		role: lambdaRole.id,
	});

	// TODO: Lock this SNS topics for which this function has pub definitions
	new iam.RolePolicy(`${nitricFunc.name}SNSAccess`, {
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

	new iam.RolePolicy(`${nitricFunc.name}DynamoDBAccess`, {
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

	const lfunction = new lambda.Function(nitricFunc.name, {
		imageUri: image.imageName, // generateEcrRepositoryUri(account, region, stackName, func) + ':latest',
		memorySize: 128,
		timeout: 15,
		packageType: 'Image',
		role: lambdaRole.arn,
	});

	const { subs = [] } = nitricFunc;

	(subs || []).forEach((sub) => {
		const topic = topics.find((t) => t.name === sub.topic);

		// Only apply if the topic exists
		if (topic) {
			new lambda.Permission(`${nitricFunc.name}${sub.topic}Permission`, {
				sourceArn: topic.awsTopic.arn,
				function: lfunction,
				principal: 'sns.amazonaws.com',
				action: 'lambda:InvokeFunction',
			});

			new sns.TopicSubscription(`${nitricFunc.name}${sub.topic}Subscription`, {
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
		awsLambda: lfunction,
	};
}

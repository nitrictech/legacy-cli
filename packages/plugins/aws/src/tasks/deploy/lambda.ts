import { generateEcrRepositoryUri } from '../../common/utils';
import { NitricFunction, normalizeFunctionName, normalizeTopicName } from '@nitric/cli-common';

/**
 * Create resources to deploy a service to AWS Lambda using Container Image deployment
 */
export default (
	stackName: string,
	func: NitricFunction,
	account: string,
	region: string,
	// vpcId: string,
	// subnets: string[], // ['subnet-1bf84844'],
	// cluster: string, //'nitric-test'
	// loadBalancerKey: string,
	// loadBalancerPriority: integer,
	// listenerKey: string,
): Record<string, any> => {
	const funcName = normalizeFunctionName(func);
	// const containerName = funcName;
	// const taskName = funcName + 'Task';
	// const taskDefName = taskName + 'Def';
	const lambdaName = funcName + 'Lambda';
	const lambdaDefName = lambdaName + 'Def';
	const lambdaRoleDefName = lambdaName + 'RoleDef';
	// const lambdaPermissionDefName = lambdaName + 'PermissionDef';
	// const apiGatewayName = funcName + 'Api';
	// const apiGatewayDefName = apiGatewayName + 'Def';
	// const apiDeploymentName = apiGatewayName + 'Deployment';
	// const apiDeploymentDefName = apiDeploymentName + 'Def';
	// const serviceName = funcName + 'Service';
	// const serviceDefName = serviceName + 'Def';
	// const targetGroupName = `${funcName}TargetGroup`;
	// const listenerRuleName = `${funcName}ListenerRule`;
	// const scalingTargetName = `${funcName}ScalingTarget`;
	// const scalingPolicyName = `${funcName}ScalingPolicy`;

	const { subs = [] } = func;

	return {
		[lambdaDefName]: {
			Type: 'AWS::Lambda::Function',
			Properties: {
				PackageType: 'Image', // Undocumented option
				Code: {
					//TODO: Generate repository with appropriate tag suffix.
					ImageUri: generateEcrRepositoryUri(account, region, stackName, func) + ':latest',
				},
				// "CodeSigningConfigArn" : String,
				// "DeadLetterConfig" : DeadLetterConfig,
				// "Description" : String,
				// "Environment" : Environment,
				// "FileSystemConfigs" : [ FileSystemConfig, ... ],
				// FunctionName: lambdaName,
				// "Handler" : String,
				// "KmsKeyArn" : String,
				// "Layers" : [ String, ... ],
				MemorySize: 128, //TODO: generate from config.
				// "ReservedConcurrentExecutions" : Integer,
				Role: {
					'Fn::GetAtt': [lambdaRoleDefName, 'Arn'],
				},
				// "Runtime" : String,
				// "Tags" : [ Tag, ... ],
				Timeout: 15, //TODO: generate from config, default 3 seconds, min 1, max 900.
				// "TracingConfig" : TracingConfig,
				// "VpcConfig" : VpcConfig
			},
		},
		[lambdaRoleDefName]: {
			Type: 'AWS::IAM::Role',
			Properties: {
				AssumeRolePolicyDocument: {
					Version: '2012-10-17',
					Statement: [
						{
							Action: ['sts:AssumeRole'],
							Effect: 'Allow',
							Principal: {
								Service: ['lambda.amazonaws.com'],
							},
						},
					],
				},
				// "Description" : String,
				ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
				// "MaxSessionDuration" : Integer,
				// "Path" : String,
				// "PermissionsBoundary" : String,
				//TODO: Add specific policies based on function config (e.g. call DynamoDB, SNS, etc.)
				Policies: [
					{
						PolicyName: 'SNSAccess',
						PolicyDocument: {
							Version: '2012-10-17',
							Statement: [
								{
									Effect: 'Allow',
									Action: ['sns:Publish', 'sns:GetTopicAttributes', 'sns:Subscribe', 'sns:ConfirmSubscription'],
									Resource: 'arn:aws:sns:*:729132059710:*',
								},
								{
									Effect: 'Allow',
									Action: ['sns:ListTopics', 'sns:Unsubscribe'],
									Resource: '*',
								},
							],
						},
					},
					{
						PolicyName: 'DynamoDBAccess',
						PolicyDocument: {
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
									],
									Resource: 'arn:aws:dynamodb:*:729132059710:table/*',
								},
								{
									Effect: 'Allow',
									Action: 'dynamodb:Query',
									Resource: 'arn:aws:dynamodb:*:729132059710:table/*/index/*',
								},
								{
									Effect: 'Allow',
									Action: 'dynamodb:ListTables',
									Resource: '*',
								},
							],
						},
					},
				],
				// "RoleName" : String,
				Tags: [
					{
						Key: 'lambda:createdBy',
						Value: `Nitric:${stackName}`,
					},
				],
			},
		},
		...subs.reduce((acc, sub) => {
			return {
				...acc,
				// Trigger Permission
				[`${func.name}${sub.topic}Permission`]: {
					Type: 'AWS::Lambda::Permission',
					Properties: {
						Action: 'lambda:InvokeFunction',
						FunctionName: {
							Ref: lambdaDefName,
						},
						Principal: 'sns.amazonaws.com',
						SourceArn: { Ref: normalizeTopicName({ name: sub.topic }) + 'TopicDef' },
					},
				},
				// Trigger (SNS Subscription)
				[`${func.name}${sub.topic}Trigger`]: {
					Type: 'AWS::SNS::Subscription',
					Properties: {
						// TODO: Define retries here...
						// DeliveryPolicy: Json,
						// TODO: Normalize function name
						Endpoint: {
							'Fn::GetAtt': [lambdaDefName, 'Arn'],
						},
						// FilterPolicy: Json,
						Protocol: 'lambda',
						// RawMessageDelivery: Boolean,
						// RedrivePolicy: Json,
						// Region: String,
						// SubscriptionRoleArn: String,
						//TODO: generate/pass in this topic reference name.
						TopicArn: { Ref: normalizeTopicName({ name: sub.topic }) + 'TopicDef' },
					},
				},
			};
		}, {}),
	};
};

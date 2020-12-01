import { generateEcrRepositoryUri } from '../../common/utils';
import { NitricFunction, normalizeFunctionName, normalizeTopicName } from '@nitric/cli-common';
import { integer } from 'aws-sdk/clients/cloudfront';

/**
 * Create resources for to deploy a service to ECS Fargate
 */
export default (
	stackName: string,
	func: NitricFunction,
	account: string,
	region: string,
	vpcId: string,
	subnets: string[], // ['subnet-1bf84844'],
	cluster: string, //'nitric-test'
	loadBalancerKey: string,
	loadBalancerPriority: integer,
	listenerKey: string,
): Record<string, any> => {
	const funcName = normalizeFunctionName(func);
	const containerName = funcName;
	const taskName = funcName + 'Task';
	const taskDefName = taskName + 'Def';
	const serviceName = funcName + 'Service';
	const serviceDefName = serviceName + 'Def';
	const targetGroupName = `${funcName}TargetGroup`;
	const listenerRuleName = `${funcName}ListenerRule`;
	const { subs = [] } = func;

	return {
		[targetGroupName]: {
			Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
			Properties: {
				// "HealthCheckEnabled" : Boolean,
				// "HealthCheckIntervalSeconds" : Integer,
				// "HealthCheckPath" : String,
				// "HealthCheckPort" : String,
				// "HealthCheckProtocol" : String,
				// "HealthCheckTimeoutSeconds" : Integer,
				// "HealthyThresholdCount" : Integer,
				// "Matcher" : Matcher,
				// "Name" : String,
				Port: 9001,
				Protocol: 'HTTP',
				// "Tags" : [ Tag, ... ],
				// "TargetGroupAttributes" : [ TargetGroupAttribute, ... ],
				// "Targets" : [ TargetDescription, ... ],
				TargetType: 'ip',
				// "UnhealthyThresholdCount" : Integer,
				VpcId: vpcId, // { Ref: 'VPC' },
			},
		},
		// We want these to be for each function with a path rule that represents the function itself
		[listenerRuleName]: {
			Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
			Properties: {
				Actions: [
					{
						Type: 'forward',
						TargetGroupArn: { Ref: targetGroupName },
					},
				],
				Conditions: [
					{
						Field: 'path-pattern',
						PathPatternConfig: {
							Values: [
								// Match the path pattern for the given function/container
								// in order to forward requests to it
								`/${func.name}/*`,
							],
						},
					},
				],
				ListenerArn: { Ref: listenerKey },
				Priority: loadBalancerPriority,
			},
		},
		[taskDefName]: {
			Type: 'AWS::ECS::TaskDefinition',
			Properties: {
				NetworkMode: 'awsvpc',
				ExecutionRoleArn: 'ecsTaskExecutionRole', //TODO: From config or create ourselves
				ContainerDefinitions: [
					{
						Name: containerName,
						// Cpu: "",
						// Memory: "",
						Image: generateEcrRepositoryUri(account, region, stackName, func),
						PortMappings: [
							{
								ContainerPort: 9001,
								HostPort: 9001,
							},
						],
						LogConfiguration: {
							LogDriver: 'awslogs',
							Options: {
								// TODO: generate log options from config
								'awslogs-group': 'nitric-test',
								'awslogs-region': region,
								'awslogs-stream-prefix': 'nitric-prefix',
							},
						},
					},
				],
				Cpu: '256', //TODO: allocate this from config
				Memory: '512', //TODO: allocate this from config
				RequiresCompatibilities: ['FARGATE'],
			},
		},
		// Define the ECS service for this function
		[serviceDefName]: {
			Type: 'AWS::ECS::Service',
			DependsOn: listenerKey, // Ensure listener is associated with target group, before creating service.
			Properties: {
				ServiceName: serviceName,
				Cluster: cluster, // TODO: generate or pull from config
				LaunchType: 'FARGATE',
				DesiredCount: func.minScale,
				NetworkConfiguration: {
					AwsvpcConfiguration: {
						AssignPublicIp: 'ENABLED', // TODO: set to disabled and use internal networking only.
						Subnets: subnets, // TODO: generate or pull from config
					},
				},
				TaskDefinition: {
					Ref: taskDefName,
				},
				LoadBalancers: [
					{
						TargetGroupArn: { Ref: targetGroupName },
						ContainerName: containerName,
						ContainerPort: 9001,
					},
				],
			},
		},
		// Setup topic subscriptions
		...subs.reduce((acc, sub) => {
			return {
				...acc,
				[`${func.name}${sub.topic}Subscription`]: {
					Type: 'AWS::SNS::Subscription',
					Properties: {
						// XXX: Define retries here...
						// DeliveryPolicy: Json,
						// TODO: Normalize function name
						Endpoint: {
							// FIXME: LoadBalancer::IP is almost certaintly incorrect
							'Fn::Sub': [
								'https://${LoadBalancerDnsName}/' + funcName,
								{ LoadBalancerDnsName: { 'Fn::GetAtt': [loadBalancerKey, 'DNSName'] } },
							],
						},
						// FilterPolicy: Json,
						Protocol: 'https',
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

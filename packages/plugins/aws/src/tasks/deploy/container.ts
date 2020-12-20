import { generateEcrRepositoryUri } from '../../common/utils';
import { NitricFunction, normalizeFunctionName, normalizeTopicName } from '@nitric/cli-common';
import { integer } from 'aws-sdk/clients/cloudfront';

/**
 * Create resources to deploy a service to ECS Fargate
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
	const scalingTargetName = `${funcName}ScalingTarget`;
	const scalingPolicyName = `${funcName}ScalingPolicy`;

	const { subs = [] } = func;

	return {
		[targetGroupName]: {
			Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
			Properties: {
				HealthCheckEnabled: true,
				// "HealthCheckIntervalSeconds" : 30,
				HealthCheckPath: '/',
				HealthCheckPort: 9002,
				HealthCheckProtocol: 'HTTP',
				// "HealthCheckTimeoutSeconds" : Integer,
				// "HealthyThresholdCount" : Integer,
				// "Matcher" : Matcher,
				Name: targetGroupName,
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
				TaskRoleArn: 'ecsTaskRole', // TODO: Create this from a set of standard policies (tbd).
				ContainerDefinitions: [
					{
						Name: containerName,
						HealthCheck: {
							Command: ['CMD-SHELL', '/healthcheck.sh'],
							// Interval : Integer, // Default 30 (seconds)
							// Retries : Integer, // Default 3
							// StartPeriod : Integer, // Default 0 (seconds)
							// Timeout : Integer // Default 5 (seconds)
						},
						// Cpu: "",
						// Memory: "",
						Image: generateEcrRepositoryUri(account, region, stackName, func),
						PortMappings: [
							{
								ContainerPort: 9001,
								HostPort: 9001,
							},
							{
								ContainerPort: 9002,
								HostPort: 9002,
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
				DesiredCount: Math.max(func.minScale || 1, 1),
				NetworkConfiguration: {
					AwsvpcConfiguration: {
						AssignPublicIp: 'ENABLED', // TODO: set to disabled and use internal networking only.
						// SecurityGroups: [], // TODO: set the custom security group.
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
		[scalingTargetName]: {
			Type: 'AWS::ApplicationAutoScaling::ScalableTarget',
			DependsOn: serviceDefName,
			Properties: {
				//TODO: improve min and max handling. If they're the same or not present, we should use desiredCount on the service and skip the auto-scaling.
				// Always set the minimum to 1 instance for AWS, since scale to 0 isn't an option in ECS with Load Balancers.
				MinCapacity: Math.max(func.minScale || 1, 1),
				MaxCapacity: Math.max(func.maxScale || Math.max(func.minScale || 2, 2), 2),
				ResourceId: `service/${cluster}/${serviceName}`,
				// TODO: Fix this nonsense.
				RoleARN: 'arn:aws:iam::729132059710:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS',
				ScalableDimension: 'ecs:service:DesiredCount',
				//  "ScheduledActions" : [ ScheduledAction, ... ],
				ServiceNamespace: 'ecs',
				// SuspendedState: SuspendedState,
			},
		},
		[scalingPolicyName]: {
			Type: 'AWS::ApplicationAutoScaling::ScalingPolicy',
			DependsOn: serviceDefName, // Wait for service to attach to target group of load balancer.
			Properties: {
				PolicyName: scalingPolicyName,
				PolicyType: 'TargetTrackingScaling',
				// FIXME: Get the resourceId of the ECS service
				// ResourceId : String,
				ScalableDimension: 'ecs:service:DesiredCount',
				// FIXME: Need a scalable target
				ScalingTargetId: { Ref: scalingTargetName },
				ServiceNamespace: 'ecs',
				// StepScalingPolicyConfiguration : StepScalingPolicyConfiguration,
				TargetTrackingScalingPolicyConfiguration: {
					// CustomizedMetricSpecification: CustomizedMetricSpecification,
					// DisableScaleIn : false,
					PredefinedMetricSpecification: {
						PredefinedMetricType: 'ALBRequestCountPerTarget',
						ResourceLabel: {
							'Fn::Sub': [
								'${lbArn}/${tgArn}',
								// "app/${lbName}/${lbId}/targetgroup/${tgName}/${tgId}",
								{
									lbArn: { 'Fn::GetAtt': [loadBalancerKey, 'LoadBalancerFullName'] },
									tgArn: { 'Fn::GetAtt': [targetGroupName, 'TargetGroupFullName'] },
									// "lbName": {"Fn::GetAtt": [loadBalancerKey, "Name"]},
									// "lbId": {"Fn::GetAtt": [loadBalancerKey, "Id"]},
									// "tgName": {"Fn::GetAtt": [targetGroupName, "Name"]},
									// "tgId": {"Fn::GetAtt": [targetGroupName, "Id"]}
								},
							],
						},
					},
					ScaleInCooldown: 60,
					ScaleOutCooldown: 300,
					// FIXME: Set this from nitric.yaml
					TargetValue: 1,
				},
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

import { NitricFunction } from '@nitric/cli-common';
import { generateLBListenerKey, generateLoadBalancerKey } from '../../common/utils';

export default (stackName: string): Record<string, any> => {
	const balancerName = generateLoadBalancerKey(stackName);

	// XXX: For now we'll apply one listener for all functions
	// and we'll route them by their name i.e. https://load-balancer-ip:load-balancer-port/{functionName}/
	const listenerName = generateLBListenerKey(stackName);
	// const ruleName = stackName + "ListenerRules";

	return {
		[balancerName]: {
			Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
			Properties: {
				// IpAddressType: String,
				// LoadBalancerAttributes: [LoadBalancerAttribute],
				// Name: String,
				// Scheme: String,
				// SecurityGroups: [String],
				// SubnetMappings: [SubnetMapping],
				// Subnets: [String],
				// Tags: [Tag],
				// Type: String,
			},
		},
		[listenerName]: {
			// "Type" : "AWS::ElasticLoadBalancingV2::Listener",
			// "Properties" : {
			//     "AlpnPolicy" : [ String, ... ],
			//     "Certificates" : [ Certificate, ... ],
			//     "DefaultActions" : [ Action, ... ],
			//     "LoadBalancerArn" : String,
			//     "Port" : Integer,
			//     "Protocol" : String,
			//     "SslPolicy" : String
			//   }
			Type: 'AWS::ElasticLoadBalancingV2::Listener',
			Properties: {
				// DefaultActions: [
				// 	{
				// 		Type: 'forward',
				// 		TargetGroupArn: { Ref: 'TargetGroup1' },
				// 	},
				// ],
				LoadBalancerArn: { Ref: balancerName },
				Port: '8000',
				Protocol: 'HTTP',
			},
		},
	};
};

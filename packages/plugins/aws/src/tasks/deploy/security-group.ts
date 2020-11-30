export default (vpcId: string, stackName: string): Record<string, any> => {
	const securityGroupId = `${stackName}-sg`; // TODO: generate this specific to the project
	return {
		[securityGroupId]: {
			Type: 'AWS::EC2::SecurityGroup',
			Properties: {
				// GroupDescription: String,
				GroupName: securityGroupId,
				// XXX: Allow access to services
				SecurityGroupEgress: [
					{
						// Allow unlimited egress
						// FIXME: For production we will likely want to setup an egress whitelist
						CidrIp: '0.0.0.0/0',
						Description: 'Allow access to all external services',
						FromPort: -1,
						IpProtocol: 'tcp',
						ToPort: -1,
					},
				],
				// XXX: Allow LB to access containers and service access (e.g. SNS push subscscriptions to access the container)
				SecurityGroupIngress: [
					{
						// CidrIp: String,
						// CidrIpv6: String,
						Description: '...',
						FromPort: 443,
						IpProtocol: 'tcp',
						// SourcePrefixListId: String,
						SourceSecurityGroupId: securityGroupId,
						// SourceSecurityGroupName: String,
						// SourceSecurityGroupOwnerId: String,
						ToPort: 443,
					},
				],
				// Tags: [ Tag, ... ],
				VpcId: vpcId, // from VPC creation/user input
			},
		},
	};
};

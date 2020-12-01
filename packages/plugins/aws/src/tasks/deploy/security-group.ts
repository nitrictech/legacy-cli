export default (vpcId: string, stackName: string): Record<string, any> => {
	const securityGroupName = `${stackName}SecurityGroup`; // TODO: generate this specific to the project

	return {
		[securityGroupName]: {
			Type: 'AWS::EC2::SecurityGroup',
			Properties: {
				GroupDescription: `Security group for ${stackName}`,
				GroupName: securityGroupName,
				// XXX: Allow access to services
				SecurityGroupEgress: [
					{
						// Allow unlimited egress
						// FIXME: For production we will likely want to setup an egress whitelist
						CidrIp: '0.0.0.0/0',
						Description: 'Allow access to all external services',
						FromPort: -1,
						// IpProtocol: 'tcp',
						IpProtocol: -1,
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
						// SourceSecurityGroupId: { Ref: securityGroupName },
						SourceSecurityGroupName: securityGroupName,
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

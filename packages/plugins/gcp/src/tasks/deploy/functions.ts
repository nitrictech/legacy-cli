import { NitricFunction, getTagNameForFunction } from '@nitric/cli-common';
import { getGcrHost } from './regions';
import { cloudrun } from '@pulumi/gcp';

/**
 * Translate a NitricFunction into a GCP function deployment
 */
export default function (
	project: string,
	stackName: string,
	func: NitricFunction,
	region: string,
): { [key: string]: any } {
	// const funcResourceName = `${sanitizeStringForDockerTag(func.name)}`;
	// Use reasonable defaults

	const grcHost = getGcrHost(region);
	const { minScale = 0, maxScale = 10 } = func;

	const service = new cloudrun.Service(func.name, {
		name: func.name,
		location: region,
		template: {
			metadata: {
				annotations: {
					'autoscaling.knative.dev/minScale': `${minScale}`,
					'autoscaling.knative.dev/maxScale': `${maxScale}`,
				},
			},
			spec: {
				containers: [
					{
						image: `${grcHost}/${project}/${getTagNameForFunction(stackName, func)}`,
						ports: [
							{
								containerPort: 9001,
							},
						],
					},
				],
			},
		},
	});

	return {
		[func.name]: service,
	};
}

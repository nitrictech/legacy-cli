import { NitricFunction, getTagNameForFunction } from '@nitric/cli-common';
/**
 *
 * @param accountId The ID of the AWS Account to store the Images in
 * @param region The AWS Region to store the Images in
 * @param stackName The Nitric Stack name, used for namespacing the images
 * @param func The function used in the images
 */
export function generateEcrRepositoryUri(
	accountId: string,
	region: string,
	stackName: string,
	func: NitricFunction,
): string {
	const imageAlias = getTagNameForFunction(stackName, func);
	return `${accountId}.dkr.ecr.${region}.amazonaws.com/${imageAlias}`;
}

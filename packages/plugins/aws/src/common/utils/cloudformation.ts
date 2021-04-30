// Copyright 2021, Nitric Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	const imageAlias = getTagNameForFunction(stackName, 'aws', func);
	return `${accountId}.dkr.ecr.${region}.amazonaws.com/${imageAlias}`;
}

export function generateLoadBalancerKey(stackName: string): string {
	return `${stackName}LB`;
}

export function generateLBListenerKey(stackName: string): string {
	return `${stackName}LBListener`;
}

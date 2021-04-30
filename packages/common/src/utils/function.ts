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

import { NitricFunction, NitricStack, NitricTopic } from '../types';

export function sanitizeStringForDockerTag(str: string): string {
	return str.toLowerCase().replace(/[^a-z0-9]/, '');
}

/**
 * Get the nitric image tag for a given function
 * @param stackName
 * @param func
 */
export function getTagNameForFunction(stackName: string, provider: string, func: NitricFunction): string {
	const { tag = `${sanitizeStringForDockerTag(stackName)}-${sanitizeStringForDockerTag(func.name)}` } = func;

	return `${tag}-${sanitizeStringForDockerTag(provider)}`;
}

/**
 * Converts a string to title case and removes non-word characters
 * e.g. this is ti/tle cASe8 -> ThisIsTitleCase
 * @param title the string to convert
 */
function cleanTitleCase(title: string): string {
	return title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).replace(/\W/g, '');
}

/**
 * Converts a string to lowercase and removes non-word characters
 * e.g. this is lo/wer cASe8 -> thisislowercase
 * @param text the string to convert
 */
function cleanLowerCase(text: string): string {
	return text.replace(/\W/g, '').toLowerCase();
}

// /**
//  * Converts a string to camel case and removes non-word characters
//  * e.g. this is ti/tle cASe8 -> thisIsCamelCase
//  * @param title the string to convert
//  */
// function cleanCamelCase(title: string): string {
// 	return title.replace(/\w\S*/g, (txt) => txt.charAt(0).toLowerCase() + txt.substr(1).toLowerCase()).replace(/\W/g, '');
// }

/**
 * Returns a normalized function name for a Nitric Function,
 * used for safe creation of names for containers and other deployment assets.
 * @param func the function to retrieve the name for
 */
export function normalizeFunctionName(func: NitricFunction): string {
	return cleanTitleCase(func.name);
}

/**
 * Returns a normalized stack name for a Nitric Stack,
 * used for safe creation of names of deployment assets.
 * @param stack the stack to retrieve the name for
 */
export function normalizeStackName(stack: NitricStack): string {
	return cleanTitleCase(stack.name);
}

/**
 * Returns a normalized topic name for a Nitric Stack,
 * used for safe creation of names of deployment assets.
 * @param topic the topic to retrieve the name for
 */
export function normalizeTopicName(topic: NitricTopic): string {
	return cleanLowerCase(topic.name);
}

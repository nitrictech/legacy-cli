import { NitricFunction, NitricStack, NitricTopic } from '../types';

export function sanitizeStringForDockerTag(str: string): string {
	return str.toLowerCase().replace(/[^a-z0-9]/, '');
}

/**
 * Get the nitric image tag for a given function
 * @param stackName
 * @param func
 */
export function getTagNameForFunction(stackName: string, func: NitricFunction): string {
	const { tag = `${sanitizeStringForDockerTag(stackName)}-${sanitizeStringForDockerTag(func.name)}` } = func;

	return tag;
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
	return cleanTitleCase(topic.name);
}

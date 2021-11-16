import { Image } from '@nitric/boxygen';

export const JVM_RUNTIME_BASE = 'adoptopenjdk/openjdk11:x86_64-alpine-jre-11.0.10_9';

/**
 * Copies across prebuilt JAR artifact from given staging image and sets cmd to execute the jar
 * @param handler - the path the the JAR artifact on the working stage
 * @param buildStage - The working stage to copy the JAR from
 * @returns
 */
export const javaRuntime =
	(handler: string, buildStage: Image) =>
	async (image: Image): Promise<void> => {
		image.copy(handler, 'function.jar', { from: buildStage }).config({
			workDir: '/',
			ports: [9001],
			cmd: ['java', '-jar', 'function.jar'],
		});
	};

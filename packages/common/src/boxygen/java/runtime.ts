// Copyright 2021, Nitric Technologies Pty Ltd.
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

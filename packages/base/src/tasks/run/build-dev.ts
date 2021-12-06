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

import { Task, prepareDevImages, RunTargets, Stack } from '@nitric/cli-common';

/**
 * Local development/testing source network options
 */
export interface BuildDevImagesOptions {
	stack: Stack;
}

/**
 * Create a docker network that allows development/test containers to communicate using their names
 */
export class BuildDevImages extends Task<RunTargets> {
	private stack: Stack;

	constructor({ stack }: BuildDevImagesOptions) {
		super(`Preparing Dev Images`);
		this.stack = stack;
	}

	async do(): Promise<RunTargets> {
		const { stack } = this;

		const update = this.update.bind(this);

		const imageBuilds = await prepareDevImages(stack, (logs) => update(logs.join('\n')));

		return imageBuilds;
	}
}

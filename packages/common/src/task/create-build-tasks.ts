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

import { Listr, ListrTask } from 'listr2';
import { wrapTaskForListr } from './wrap-task';
import { Stack } from '../stack';
import { BuildFunctionTask } from './build-function';
import { BuildContainerTask } from './build-container';

// Utility function to create a list of build function/source tasks from
// a given nitric stack
export function createBuildTasks(
	stack: Stack,
	directory: string,
	provider = 'local',
): (BuildFunctionTask | BuildContainerTask)[] {
	// Create function source images using Buildpacks
	const funcTasks = stack.getFunctions().map(
		(func): BuildFunctionTask =>
			new BuildFunctionTask({
				func,
				baseDir: directory,
				provider,
			}),
	);

	// Create source images using Docker
	const containerTasks = stack.getContainers().map(
		(container): BuildContainerTask =>
			new BuildContainerTask({
				container,
				baseDir: directory,
				provider,
			}),
	);

	return [...funcTasks, ...containerTasks];
}

export function createBuildListrTask(stack: Stack, provider = 'local'): ListrTask<any> {
	return {
		title: 'Building Services',
		task: (_, task): Listr =>
			task.newListr(
				// Create a sub-task to build each func in the project
				createBuildTasks(stack, stack.getDirectory(), provider).map((t) => wrapTaskForListr(t)),
				{
					concurrent: true,
					// Don't fail all on a single function failure...
					exitOnError: true,
					// Added to allow custom handling of SIGINT for run cmd cleanup.
					registerSignalListeners: false,
				},
			),
	};
}

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
import { BuildServiceTask } from './build-service';

// Utility function to create a list of build service tasks from
// a given nitric stack
export function createBuildTasks(stack: Stack, directory: string, provider = 'dev'): BuildServiceTask[] {
	return stack.getServices().map(
		(service): BuildServiceTask =>
			new BuildServiceTask({
				service,
				baseDir: directory,
				provider,
			}),
	);
}

export function createBuildListrTask(stack: Stack, provider = 'dev'): ListrTask<any> {
	return {
		title: 'Building Services',
		task: (_, task): Listr =>
			task.newListr(
				// Create a sub-task to build each service in the project
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

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

import { ListrTask } from 'listr2';
import { Task } from './task';

interface TaskFactory<T> {
	name: string;
	factory: (ctx: any) => Task<T>;
	skip?: (ctx: any) => boolean;
}

type TaskOrTaskFactory<T> = Task<T> | TaskFactory<T>;

export function wrapTaskForListr<T>(
	taskOrTaskFactory: TaskOrTaskFactory<T>,
	ctxKey?: string,
	...args: any[]
): ListrTask<{ [key: string]: T }> {
	const contextKey = ctxKey || taskOrTaskFactory.name;

	return {
		title: taskOrTaskFactory.name,
		// Doesn't matter if we don't have a task factory here
		// It will come up as undefined otherwise
		skip: (taskOrTaskFactory as TaskFactory<any>).skip,
		task: async (ctx, task): Promise<T> => {
			const t = Object.keys(taskOrTaskFactory).includes('factory')
				? (taskOrTaskFactory as TaskFactory<T>).factory(ctx)
				: (taskOrTaskFactory as Task<T>);

			t.on('update', (message) => (task.output = message));
			const result = await t.run(...args);
			ctx[contextKey] = result;
			return result;
		},
	};
}

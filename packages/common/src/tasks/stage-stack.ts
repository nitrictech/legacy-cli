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

import { Stack } from '../stack';
import { Task } from '../task';

interface StageStackOptions {
	stack: Stack;
}

export class StageStackTask extends Task<void> {
	private stack: Stack;

	constructor({ stack }: StageStackOptions) {
		super(`Staging stack ${stack.getName()}`);
		this.stack = stack;
	}

	async do(): Promise<void> {
		const { stack } = this;

		await Stack.stage(stack);
	}
}

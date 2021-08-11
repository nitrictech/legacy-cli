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

import { Stack, Task } from '@nitric/cli-common';
import { pullTemplate } from '../../utils';

interface InstallProjectTemplateTaskOpts {
	stack: Stack;
	template: string;
}

export class InstallProjectTemplateTask extends Task<boolean> {
	private stack: Stack;
	private template: string;

	constructor({ stack, template }: InstallProjectTemplateTaskOpts) {
		super(`Install ${template}`);
		this.stack = stack;
		this.template = template;
	}

	async do(): Promise<boolean> {
		this.update(`Installing ${this.template}`);
		await pullTemplate(this.stack, this.template);
		this.update(`Installed ${this.template}`);
		return true;
	}
}

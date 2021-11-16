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

export const TS_IGNORE = ['node_modules/', '.nitric/', '.git/', '.idea/'];

export const baseTsFunction = async (image: Image): Promise<void> => {
	image
		.run(['yarn', 'global', 'add', 'typescript'])
		.run(['yarn', 'global', 'add', 'ts-node'])
		.copy('package.json *.lock *-lock.json', '/')
		.run(['yarn', 'import', '||', 'echo', '"Lockfile already exists"'])
		.run([
			'set',
			'-ex;',
			'yarn',
			'install',
			'--frozen-lockfile',
			'--cache-folder',
			'/tmp/.cache;',
			'rm',
			'-rf',
			'/tmp/.cache;',
		]);
};

export const configureTsFunction =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image.copy('.', '.').config({
			cmd: ['ts-node', '-T', handler],
		});
	};

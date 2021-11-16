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

export const buildGoApp =
	(handler: string, exeOut: string) =>
	async (image: Image): Promise<void> => {
		image
			.run(['apk', 'update'])
			.run(['apk', 'upgrade'])
			.run(['apk', 'add', '--no-cache', 'git', 'gcc', 'g++', 'make'])
			.config({
				workDir: '/app/',
			})
			.copy('go.mod *.sum', '.')
			.run(['go', 'mod', 'download'])
			.copy('.', '.')
			.run(['CGO_ENABLED=0', 'GOOS=linux', 'go', 'build', '-o', `${exeOut}`, `${handler}`]);
	};

export const buildGoFinal =
	(buildStage: Image, srcExe: string) =>
	async (image: Image): Promise<void> => {
		image
			.copy(srcExe, '/bin/function', { from: buildStage })
			.run(['chmod', '+x-rw', '/bin/function'])
			.config({
				ports: [9001],
				workDir: '/',
				cmd: ['/bin/function'],
			});
	};

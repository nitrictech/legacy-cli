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

export const PYTHON_IGNORE = ['__pycache__/', '*.py[cod]', '*$py.class'];

export const python =
	(handler: string) =>
	async (image: Image): Promise<void> => {
		image
			.run(['pip', 'install', '--upgrade', 'pip'])
			.config({ workDir: '/app/' })
			.copy('requirements.txt', 'requirements.txt')
			.run(['pip', 'install', '--no-cache-dir', '-r', 'requirements.txt'])
			.copy('.', '.')
			.config({
				env: {
					PYTHONPATH: '/app/:${PYTHONPATH}',
				},
				ports: [9001],
				cmd: ['python', handler],
			});
	};

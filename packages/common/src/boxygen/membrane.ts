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

export const installMembrane =
	(provider: string, version = 'latest') =>
	async (image: Image): Promise<void> => {
		let fetchFrom = `https://github.com/nitrictech/nitric/releases/download/${version}/membrane-${provider}`;
		if (version === 'latest') {
			fetchFrom = `https://github.com/nitrictech/nitric/releases/${version}/download/membrane-${provider}`;
		}
		image
			.add(fetchFrom, '/usr/local/bin/membrane')
			.run(['chmod', '+x-rw', '/usr/local/bin/membrane'])
			.config({
				entrypoint: ['/usr/local/bin/membrane'],
			});
	};

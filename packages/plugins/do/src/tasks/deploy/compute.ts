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

import { NitricContainerImage, NitricEntrypoint, NitricFunctionImage } from '@nitric/cli-common';
import * as digitalocean from '@pulumi/digitalocean';

interface CreateComputeResult {
	spec: digitalocean.types.input.AppSpecService;
}

export function createComputeServiceSpec(
	name: string,
	image: NitricFunctionImage | NitricContainerImage,
	entrypoint: NitricEntrypoint,
): CreateComputeResult {
	return {
		spec: {
			name: name,
			httpPort: 9001,
			image: {
				registryType: 'DOCR',
				// TODO: Apply docker deployed repository here...
				repository: image.name,
				tag: image.imageDigest,
			},
			routes: Object.entries(entrypoint.paths)
				.filter(([, opts]) => opts.target === name)
				.map(([path]) => ({ path })),
		},
	};
}

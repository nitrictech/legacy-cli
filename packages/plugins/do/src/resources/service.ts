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
import { NitricServiceImage, Service } from "@nitric/cli-common";
import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

interface NormalizedFunctionEntrypoint {
	path: string;
	name: string;
	type: 'service' | 'site' | 'api';
}

/**
 * Nitric Service for Digital Ocean
 */
interface NitricServiceAppPlatformArgs {
	service: Service;
	image: NitricServiceImage;
	entrypoints: NormalizedFunctionEntrypoint[];
}

export class NitricServiceAppPlatform extends pulumi.ComponentResource {

	public readonly spec: digitalocean.types.input.AppSpecService;

	constructor(name: string, args: NitricServiceAppPlatformArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:do:Service", name, {}, opts);

		const { service, image, entrypoints } = args;

		this.spec = {
			name: service.getName(),
			httpPort: 9001,
			image: {
				registryType: 'DOCR',
				// TODO: Apply docker deployed repository here...
				repository: image.name,
			},
			routes: entrypoints.filter(({ name }) => name === service.getName()).map(({ path }) => ({ path })),
		};

		this.registerOutputs({
			spec: this.spec,
		})
	}
}
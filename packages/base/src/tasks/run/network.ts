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

import { Task } from '@nitric/cli-common';
import Docker, { Network } from 'dockerode';

/**
 * Local development/testing container network options
 */
export interface CreateNetworkTaskOptions {
	name: string;
	docker?: Docker;
}

/**
 * Create a docker network that allows development/test containers to communicate using their names
 */
export class CreateNetworkTask extends Task<Network> {
	private networkName: string;
	private docker: Docker;

	constructor({ name, docker = new Docker() }) {
		super(`Creating docker network`);
		this.networkName = name;
		this.docker = docker;
	}

	async do(): Promise<Network> {
		const { networkName, docker } = this;
		return await docker.createNetwork({
			Name: networkName,
			// Driver: "bridge", // defaults to 'bridge' driver.
		});
	}
}

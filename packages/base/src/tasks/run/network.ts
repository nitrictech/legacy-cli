import { Task } from '@nitric/cli-common';
import Docker, { Network } from 'dockerode';

export interface CreateNetworkTaskOptions {
	name: string;
	docker?: Docker;
}

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
		const network = await docker.createNetwork({
			Name: networkName,
			// Driver: "bridge", // defaults to 'bridge' driver.
		});
		return network;
	}
}

import { Task } from '@nitric/cli-common';
import Docker, { Volume } from 'dockerode';

interface CreateVolumeTaskOptions {
	dockerClient?: Docker;
	volumeName: string;
}

export class CreateVolumeTask extends Task<Volume> {
	private dockerClient: Docker;
	private volumeName: string;

	constructor({ dockerClient = new Docker(), volumeName }: CreateVolumeTaskOptions) {
		super(`Creating Volume: ${volumeName}`);
		this.dockerClient = dockerClient;
		this.volumeName = volumeName;
	}

	async do(): Promise<Volume> {
		const { dockerClient, volumeName } = this;

		const volume = await dockerClient.createVolume({
			Name: volumeName,
		});

		return volume;
	}
}

import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import { Service } from "@nitric/cli-common";

// TODO: Make this common
type MembraneProviders = "dev" | "aws" | "gcp" | "azure" | "do";

interface NitricServiceImageArgs {
	service: Service;
	username: pulumi.Input<string>;
	password: pulumi.Input<string>;
	imageName: pulumi.Input<string>;
	server: pulumi.Input<string>;
	nitricProvider: pulumi.Input<MembraneProviders>;
}

/**
 * 
 */
export class NitricServiceImage extends pulumi.ComponentResource {
	/**
	 * Just the image name
	 */
	public readonly name: pulumi.Output<string>;

	/**
	 * The full image URI
	 */
	public readonly imageUri: pulumi.Output<string>;

	/**
	 * The full image name including tag name
	 */
	public readonly baseImageName: pulumi.Output<string>;
	

	constructor(name, args: NitricServiceImageArgs, opts?: pulumi.ComponentResourceOptions) {
		super("nitric:docker:Image", name, {}, opts);

		const { imageName, username, password, server, service, nitricProvider } = args;

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		const image = new docker.Image(`${service.getImageTagName()}-image`, {
			imageName,
			build: {
				// Staging directory
				context: service.getStagingDirectory(),
				args: {
					PROVIDER: nitricProvider,
				},
				// Create a reasonable shared memory space for image builds
				extraOptions: ['--shm-size', '1G'],
			},
			registry: {
				server,
				username,
				password,
			},
		}, defaultResourceOptions);

		image.imageName.apply((name) => name.split('/').pop()!.split(':')[0] as string);

		this.imageUri = image.imageName;
		this.name = image.imageName.apply((name) => name.split('/').pop()!.split(':')[0] as string);
		this.baseImageName = image.baseImageName;

		this.registerOutputs({
			name: this.name,
			imageUri: this.imageUri,
			baseImageName: this.baseImageName,
		});
	}
}
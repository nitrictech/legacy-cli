import { NitricAPI, Task } from "@nitric/cli-common";
import { STAGING_API_DIR } from "../../common/paths";
import Docker, { Container, ContainerCreateOptions, Network, NetworkInspectInfo } from "dockerode";
import fs from "fs";
import getPort from 'get-port';
import tar from 'tar-fs';

export interface RunGatewayTaskOptions {
  stackName: string;
  api: NitricAPI;
  port?: number;
  docker: Docker;
  network?: Network;
}

const GATEWAY_PORT = 8080;



export function createAPIStagingDirectory(): string {
	// createNitricHome();
	// create temporary staging directory
	if (!fs.existsSync(`${STAGING_API_DIR}`)) {
		fs.mkdirSync(`${STAGING_API_DIR}`);
  }
  
  return `${STAGING_API_DIR}`;
}

export function createAPIDirectory(apiName: string): string {
	const stagingDir = createAPIStagingDirectory();
	// create temporary staging directory
	if (!fs.existsSync(`${stagingDir}/${apiName}`)) {
		fs.mkdirSync(`${stagingDir}/${apiName}`);
  }
  
  return `${stagingDir}/${apiName}`;
}

/**
 * RunGatewayTask
 */
export class RunGatewayTask extends Task<Container> {
  private stackName: string;
  private api: NitricAPI;
  private port?: number;
  private network?: Network;
  private docker: Docker;

  constructor({ stackName, api, port, docker, network }: RunGatewayTaskOptions) {
    super("Creating API Gateways");
    this.stackName = stackName;
    this.api = api;
    this.port = port;
    this.docker = docker;
    this.network = network;
  }

  async do(): Promise<Container> {
    const { stackName, api, network } = this;

    if (!this.port) {
      this.port = await getPort();
    }

    let networkName = 'bridge';
		if (network) {
			try {
				networkName = ((await network?.inspect()) as NetworkInspectInfo).Name;
			} catch (error) {
				console.warn(`Failed to set custom docker network, defaulting to bridge network`);
			}
		}

    const dockerOptions = {
      name: `${stackName}-${api.name}`,
      // Pull the image from public docker repo
      Image: "nitricimages/dev-api-gateway",
			ExposedPorts: {
				[`${GATEWAY_PORT}/tcp`]: {},
			},
			Volumes: {},
			HostConfig: {
				NetworkMode: networkName,
				PortBindings: {
					[`${GATEWAY_PORT}/tcp`]: [
						{
							HostPort: `${this.port}/tcp`,
						},
					],
				},
			},
    } as ContainerCreateOptions;

    
    
    const container = await this.docker.createContainer(dockerOptions)

    const { name, ...spec } = api;

    const dirName = createAPIDirectory(name);

    fs.writeFileSync(`${dirName}/openapi.json`, JSON.stringify(spec))
    // use tarfs to create a buffer to pipe to put archive...
    const packStream = tar.pack(dirName);

    // Write the open api file to this api gateway container
    await container.putArchive(packStream, {
      path: "/"
    });
    await container.start();

    return container;
  }
}
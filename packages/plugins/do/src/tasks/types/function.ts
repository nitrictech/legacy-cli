import { NitricFunction } from '@nitric/cli-common';
import * as digitalocean from '@pulumi/digitalocean';

export interface DeployedFunction extends NitricFunction {
	app: digitalocean.App;
}

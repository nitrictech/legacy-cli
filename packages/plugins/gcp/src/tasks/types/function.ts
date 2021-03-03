import { NitricFunction } from '@nitric/cli-common';
import { cloudrun } from '@pulumi/gcp';

export interface DeployedFunction extends NitricFunction {
	cloudRun: cloudrun.Service;
}

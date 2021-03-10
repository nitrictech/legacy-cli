import { NitricSchedule } from '@nitric/cli-common';
import { cloudscheduler } from '@pulumi/gcp';

export interface DeployedSchedule extends NitricSchedule {
	job: cloudscheduler.Job;
}

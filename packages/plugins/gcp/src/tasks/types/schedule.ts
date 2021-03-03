export interface DeployedSchedule extends NitricSchedule {
	job: cloudscheduler.Job;
}
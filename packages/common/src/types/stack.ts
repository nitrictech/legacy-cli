import { NitricFunction } from './function';
import { NitricBucket } from './bucket';
import { NitricTopic } from './topic';
import { NitricSchedule } from './schedule';
import { NitricAPI } from './api';
import { NitricStaticSite } from './static-site';

/**
 * A Nitric application stack descriptor
 */
export interface NitricStack {
	// Name of the Nitric Stack
	name: string;
	// Functions that will be deployed
	functions?: NitricFunction[];
	// Buckets that will be deployed
	buckets?: NitricBucket[];
	// Topics that will be created
	topics?: NitricTopic[];
	// Schedules that will be configured
	schedules?: NitricSchedule[];
	// APIs to be deployed
	apis?: NitricAPI[];
	// Static sites to be deployed
	sites?: NitricStaticSite[];
}

import { NitricFunction } from './function';
import { NitricBucket } from './bucket';
import { NitricTopic } from './topic';
import { NitricQueue } from './queue';
import { NitricSchedule } from './schedule';
import { NitricAPI } from './api';
import { NitricStaticSite } from './static-site';
import { NitricEntrypoints } from './entrypoints';

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
	// Queues that will be created
	queues?: NitricQueue[];
	// Schedules that will be configured
	schedules?: NitricSchedule[];
	// APIs to be deployed
	apis?: NitricAPI[];
	// Static sites to be deployed
	sites?: NitricStaticSite[];
	// Define entrypoints for routing/egress in the nitric application
	entrypoints?: NitricEntrypoints;
}

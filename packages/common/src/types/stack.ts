import { NitricFunction } from './function';
import { NitricBucket } from './bucket';
import { NitricTopic } from './topic';
import { NitricSchedule } from './schedule'; 
import { NitricAPI } from './api';

/**
 * A Nitric application stack descriptor
 */
export interface NitricStack {
	name: string;
	functions?: NitricFunction[];
	buckets?: NitricBucket[];
	topics?: NitricTopic[];
	schedules?: NitricSchedule[];
	apis?: NitricAPI[];
}

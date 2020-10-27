import { NitricFunction } from './function';
import { NitricBucket } from './bucket';
import { NitricTopic } from './topic';

/**
 * A Nitric application stack descriptor
 */
export interface NitricStack {
	name: string;
	functions?: NitricFunction[];
	buckets?: NitricBucket[];
	topics?: NitricTopic[];
}

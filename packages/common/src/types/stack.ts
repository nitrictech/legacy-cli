// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { NitricBucket } from './bucket';
import { NitricTopic } from './topic';
import { NitricQueue } from './queue';
import { NitricSchedule } from './schedule';
import { NitricAPI } from './api';
import { NitricStaticSite } from './static-site';
import { NitricEntrypoints } from './entrypoints';
import { NitricService } from './service';

/**
 * A Nitric application stack descriptor
 */
export interface NitricStack {
	// Name of the Nitric Stack
	name: string;
	// Functions that will be deployed
	services?: {
		[name: string]: NitricService;
	};
	// Buckets that will be deployed
	buckets?: {
		[name: string]: NitricBucket;
	};
	// Topics that will be created
	topics?: {
		[name: string]: NitricTopic;
	};
	// Queues that will be created
	queues?: {
		[name: string]: NitricQueue;
	};
	// Schedules that will be configured
	schedules?: {
		[name: string]: NitricSchedule;
	};
	// APIs to be deployed
	apis?: {
		[name: string]: NitricAPI;
	};
	// Static sites to be deployed
	sites?: {
		[name: string]: NitricStaticSite;
	};
	// Define entrypoints for routing/egress in the nitric application
	entrypoints?: NitricEntrypoints;
}

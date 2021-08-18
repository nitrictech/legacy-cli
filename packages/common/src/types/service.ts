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

export interface NitricServiceTriggers {
	topics?: string[];
}

export interface NitricServiceProfile {
	env?: string[];
	ports?: string[];
}

export interface NitricService<Ext extends Record<string, any> = Record<string, unknown>> {
	path: string;
	runtime: string;
	// Scripts that will be executed by the nitric
	// build process before begining the docker build
	buildScripts?: string[];
	// files to exclude from final build
	// can be globs
	excludes?: string[];
	// Allow the user to specify a custom unique tag for the function
	tag?: string;
	// subs?: NitricSubscription[];
	triggers?: NitricServiceTriggers;
	// The minimum number of instances to keep alive
	minScale?: number;
	// The maximum nunber of instances to scale to
	maxScale?: number;
	// The most requests a single function instance should handle
	maxRequests?: number;
	// Simple configuration to determine if the function should be directly
	// invokable without authentication
	// would use public, but its reserved by typescript
	external?: boolean;
	ext?: Ext;
	profiles?: {
		[key: string]: NitricServiceProfile;
	};
}

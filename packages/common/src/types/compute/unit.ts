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

import { NitricComputeUnitTriggers } from './triggers';

export interface NitricComputeUnit<Ext extends Record<string, any> = never> {
	// A stack relative context for the directory that will
	// be included in the build
	context?: string;
	// Triggers used to invoke this compute unit, e.g. Topic Subscriptions
	triggers?: NitricComputeUnitTriggers;
	// The minimum number of instances to keep alive
	minScale?: number;
	// The maximum number of instances to scale to
	maxScale?: number;
	// Allow the user to specify a custom unique tag for the function
	tag?: string;
	// Custom extensions
	ext?: Ext;
}

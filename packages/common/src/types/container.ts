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

export interface NitricContainerTriggers {
	topics?: string[];
}

export interface NitricContainer<Ext extends Record<string, any> = never> {
	// A stack relative context for the directory that will
	// be included in the build
	context: string;
	// The path to the Dockerfile to use to build this container
	// relative to context
	dockerfile: string;
	triggers?: NitricContainerTriggers;
	// The minimum number of instances to keep alive
	minScale?: number;
	// The maximum number of instances to scale to
	maxScale?: number;
	// Custom extensions
	ext?: Ext;
}

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

// A subset of a NitricEvent
// excluding it's requestId
// This will be generated based on the scedule
export interface NitricScheduleEvent {
	// requestId: string
	payloadType: string;
	payload: Record<string, any>;
}

export interface NitricScheduleTarget {
	type: 'topic'; // ; | "queue"
	id: string;
}

/**
 * A Nitric Schedule definition
 */
export interface NitricSchedule {
	name: string;
	expression: string;
	// The Topic to be targeted for schedule
	target: NitricScheduleTarget;
	event: NitricScheduleEvent;
}

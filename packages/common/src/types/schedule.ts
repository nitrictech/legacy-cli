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

import { Stack } from "../stack";
import { Task } from "../task";

interface StageStackOptions {
	stack: Stack;
}

export class StageStackTask extends Task<void> {
	private stack: Stack;

	constructor({ stack }: StageStackOptions) {
		super(`Staging stack ${stack.getName()}`)
		this.stack = stack;
	}

	async do(): Promise<void> {
		const { stack } = this;

		await Stack.stage(stack);
	}
}
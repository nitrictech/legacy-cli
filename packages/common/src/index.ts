import { Observable } from 'rxjs';
import { Task } from './task';
import { ListrTask } from 'listr';

interface TaskFactory<T> {
	name: string;
	factory: (ctx: any) => Task<T>;
	skip?: (ctx: any) => boolean;
}

type TaskOrTaskFactory<T> = Task<T> | TaskFactory<T>;

export function wrapTaskForListr<T>(
	taskOrTaskFactory: TaskOrTaskFactory<T>,
	ctxKey?: string,
	...args: any[]
): ListrTask<{ [key: string]: T }> {
	const contextKey = ctxKey || taskOrTaskFactory.name;

	return {
		title: taskOrTaskFactory.name,
		// Doesn't matter if we don't have a task factory here
		// It will come up as undefined otherwise
		skip: (taskOrTaskFactory as TaskFactory<any>).skip,
		task: (ctx): Observable<any> =>
			new Observable((obs) => {
				const task = Object.keys(taskOrTaskFactory).includes('factory')
					? (taskOrTaskFactory as TaskFactory<T>).factory(ctx)
					: (taskOrTaskFactory as Task<T>);
				task.on('update', (message) => obs.next(message));
				task.on('error', (error) => obs.error(error));
				task.on('done', (result: T) => {
					ctx[contextKey] = result;
					obs.complete();
				});
				task.run(...args);
			}),
	};
}

/**
 * Writes the given nitric stack to a descriptor file
 * @param nitricStack the stack to write out
 * @param nitricFile the YAML file to write to
 */
//export function writeNitricDescriptor(nitricStack: NitricStack, nitricFile = './nitric.yaml'): void {
//	fs.writeFileSync(nitricFile, YAML.stringify(nitricStack));
//}

// export function readNitricDescriptor(nitricFile = './nitric.yaml'): NitricStack {
// 	// Read the nitric file on the provided nitric file path
// 	return YAML.parse(fs.readFileSync(nitricFile).toString('utf-8')) as NitricStack;
// }

export function dockerodeEvtToString({ stream, progress, status, errorDetail }): string {
	if (errorDetail) {
		throw new Error(errorDetail.message);
	}
	if (status) {
		if (progress) {
			return `${status}: ${progress}`;
		} else {
			return `${status}`;
		}
	} else {
		return `${stream}`;
	}
}

export * from './task';
export * from './types';
export * from './utils';
export * from './stack';
export * from './templates';
export * from './tasks';
export * from './paths';

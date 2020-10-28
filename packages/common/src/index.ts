import { Observable } from 'rxjs';
import * as YAML from 'yaml';
import { NitricStack } from './types/';
import { Task } from './task';
import { ListrTask } from 'listr';
import * as fs from 'fs';

export function wrapTaskForListr<T>(task: Task<T>, ...args: any[]): ListrTask<{ [key: string]: T }> {
	return {
		title: task.name,
		task: (ctx): Observable<any> =>
			new Observable((obs) => {
				task.on('update', (message) => obs.next(message));
				task.on('error', (error) => obs.error(error));
				task.on('done', (result: T) => {
					ctx[task.name] = result;
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
export function writeNitricDescriptor(nitricStack: NitricStack, nitricFile = './nitric.yaml'): void {
	fs.writeFileSync(nitricFile, YAML.stringify(nitricStack));
}

export function readNitricDescriptor(nitricFile = './nitric.yaml'): NitricStack {
	// Read the nitric file on the provided nitric file path
	return YAML.parse(fs.readFileSync(nitricFile).toString('utf-8')) as NitricStack;
}

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

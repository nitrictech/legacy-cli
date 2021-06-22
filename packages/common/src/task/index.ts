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

import EventEmitter from 'eventemitter3';

const REJECTION_TIMEOUT = 5000;

/**
 * An abstract Task to be used by Listr
 */
export abstract class Task<T> extends EventEmitter {
	private _name: string;

	constructor(name: string) {
		super();
		this._name = name;
	}

	get name(): string {
		return this._name;
	}

	protected update(message: string): void {
		this.emit('update', message);
	}

	protected abstract do(...args: any[]): Promise<T>;

	/**
	 * Execute the task, typically following the setup of event listeners
	 */
	public async run(...args: any[]): Promise<T> {
		// TODO: Restore the original handlers after deployment is done
		try {
			const rejectionPromise = new Promise<T>((_, reject) => {
				process.once('unhandledRejection', (e) => {
					// FIXME: Doing this at the moment to allow pulumi based tasks to try and achieve a stable state before exiting
					// Right now stacks are hanging on dependent resources when they are failing
					setTimeout(() => {
						reject(e);
					}, REJECTION_TIMEOUT);
				});
			});

			const results = await Promise.race([
				this.do(...args),
				rejectionPromise
			]); 


			return results;
		} catch (e) {
			throw new Error(`${e.message}`);
		}
	}
}

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
import { Visitor } from 'universal-analytics';

/**
 * Command client for command analytics
 */
export class CommandClient {
	private name: string;
	private visitor?: Visitor;
	private startTime?: number;

	constructor(name: string, visitor?: Visitor) {
		this.name = name;
		this.visitor = visitor;
	}

	/**
	 * Start the command
	 */
	public start(): CommandClient {
		this.startTime = new Date().getTime();

		if (this.visitor) {
			this.visitor.pageview(this.name, 'CLI');
			this.visitor.event(this.name, 'start');
		}

		return this;
	}

	/**
	 * Log an error for the command
	 * @param error
	 * @param fatal
	 */
	public error(error: Error, fatal: boolean): CommandClient {
		if (this.visitor) {
			this.visitor.exception(error.stack || error.message, fatal);
		}

		return this;
	}

	/**
	 * Stop the command
	 */
	public async stop(): Promise<void> {
		if (!this.startTime) {
			throw new Error('Command client stopped without being started');
		}

		if (this.visitor) {
			this.visitor.event(this.name, 'stop');

			const runtime = new Date().getTime() - this.startTime;

			await new Promise<void>((res) => {
				this.visitor!.timing(this.name, 'runtime', runtime).send(() => {
					res();
				});
			});
		}
	}
}

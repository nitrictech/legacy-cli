import EventEmitter from 'eventemitter3';

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

	protected abstract async do(...args: any[]): Promise<T>;

	/**
	 * Execute the task, typically following the setup of event listeners
	 */
	public async run(...args: any[]): Promise<void> {
		try {
			const result = await this.do(...args);
			this.emit('done', result);
		} catch (error) {
			this.emit('error', error);
		}
	}
}

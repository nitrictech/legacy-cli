import { NitricSubscription } from './subscription';

export interface NitricFunction {
	name: string;
	path: string;
	runtime: string;
	// Scripts that will be executed by the nitric
	// build process before begining the docker build
	buildScripts?: string[];
	// files to exclude from final build
	// can be globs
	excludes?: string[];
	// Allow the user to specify a custom unique tag for the function
	tag?: string;
	subs?: NitricSubscription[];
	// The minimum number of instances to keep alive
	minScale?: number;
	// The maximum nunber of instances to scale to
	maxScale?: number;
	// The most requests a single function instance should handle
	maxRequests?: number;
	// Simple configuration to determine if the function should be directly
	// invokable without authentication
	// would use public, but its reserved by typescript
	external?: boolean;
}

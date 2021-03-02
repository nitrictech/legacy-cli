import { NitricStaticSite } from "../types";
import { Stack } from "./stack";
import execa from "execa";
import path from "path";

/**
 * A Nitric Static Site
 */
export class Site {
	private stack: Stack;
	private descriptor: NitricStaticSite;

	constructor(stack: Stack, descriptor: NitricStaticSite) {
		this.stack = stack;
		this.descriptor = descriptor;
	}

	getPath(): string {
		return path.join(this.stack.getDirectory(), this.descriptor.path);
	}

	getName(): string {
		return this.descriptor.name;
	}

	// Return the original nitric descriptor
	getDesciptor(): NitricStaticSite {
		return this.descriptor;
	}

	// Get the asset path of a static site
	getAssetPath(): string {
		const baseAssetPath = this.descriptor.assetPath 
			? path.join(this.descriptor.path, this.descriptor.assetPath)
			: this.descriptor.path;

		return path.join(this.stack.getDirectory(), baseAssetPath);
	}

	static async build(site: Site): Promise<void> {
		// Build the static site given a set of build scripts
		if (site.descriptor.buildScripts) {
			const workingDir = site.getPath();

			for (const script of site.descriptor.buildScripts) {
				await execa.command(script, { cwd: workingDir });
			}
		}
	}
}
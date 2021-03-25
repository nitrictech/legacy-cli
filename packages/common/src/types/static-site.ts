// A static site deployment with Nitric
// We also support server rendered applications
export interface NitricStaticSite {
	// A name for the static site...
	name: string;
	// Base path of the site
	// Will be used to execute scripts
	path: string;
	// Path to get assets to upload
	// this will be relative to path
	assetPath?: string;
	// Build scripts to execute before upload
	buildScripts?: string[];
}

// A static site deployment with Nitric
// We also support server rendered applications
export interface NitricStaticSite {
	// A name for the static site...
	name: string;
	// Path to upload to bucket for static hosting
	path: string;
	// Build scripts to execute before upload
	buildScripts?: string[];
}

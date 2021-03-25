import fs from "fs";

/**
 * crawlDirectory
 * Recursively crawls a directory tree and performs the given callback operation on every file in that tree
 * @param dir 
 * @param f 
 */
export async function crawlDirectory(dir: string, f: (_: string) => Promise<void>): Promise<void> {
	const files = await fs.promises.readdir(dir);
	for (const file of files) {
		const filePath = `${dir}/${file}`;
		const stat = await fs.promises.stat(filePath);
		if (stat.isDirectory()) {
			await crawlDirectory(filePath, f);
		}
		if (stat.isFile()) {
			await f(filePath);
		}
	}
}
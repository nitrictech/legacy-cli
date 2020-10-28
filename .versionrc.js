// .versionrc.js
const globby = require('globby');

// Find all package.json files, so long as they're not in a node_modules directory
const pkgPaths = globby.sync(['packages/**/package.json', '!packages/**/node_modules/**/package.json']);

const packageFiles = ['./package.json'];
const bumpFiles = [
	...packageFiles,
	...pkgPaths.map((path) => ({
		filename: path,
		type: 'json',
	})),
];

module.exports = {
	bumpFiles,
	packageFiles,
};

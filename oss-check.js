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

// Open-Source License Check
// Performs a basic scan of dependencies to ensure they provide permissive use open-aource licenses

const legally = require('legally');

// List of allowed licenses
const licenseAllowList = [
	'0BSD',
	'Apache 2.0',
	'BSD',
	'BSD 2 Clause',
	'BSD 3 Clause',
	'CC0',
	'ISC',
	'MIT',
	'MPL 2.0',
	'WTFPL',
	'Unlicense',
];

// Modules to ignore, typically this is because they've been manually verified or they're only used in non-distributed code.
const ignoreModules = [
	// rxjx modules that come back undefined, even though the correct license is available
	/^rxjs\/.*/,
	// an erroneous module to be ignored.
	/^undefined@.*$/,
	// gitconfiglocal only used by standard-version for version bumps, it's a build tool and not distributed
	/^gitconfiglocal@\d+(\.\d+){2}$/,
	// used by eslint, not distributed
	/^language-subtag-registry@\d+(\.\d+){2}$/,
	// used by a handful of build tools
	/^spdx-exceptions@\d+(\.\d+){2}$/,
	// jison-lex and nomnom are MIT licensed, but report as undefined
	/^jison-lex@\d+(\.\d+){2}$/,
	/^nomnom@\d+(\.\d+){2}$/,
	/^tcfg@.*$/,
];

/**
 * Filter function to remove non-unique elements.
 */
function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

/**
 * Scan licenses.
 *
 * Exits 0 if all licenses are acceptable.
 * Exits 1 with a list of modules printed to the console if non-compliant licenses are detected.
 */
(async () => {
	const licenses = await legally();
	const uniqueLicenses = Object.entries(licenses).reduce((acc, [module, license]) => {
		for (let i = 0; i < ignoreModules.length; i++) {
			if (ignoreModules[i].test(module)) {
				return acc;
			}
		}
		return {
			...acc,
			[module]: Object.values(license)
				.reduce((acc, licenseArr) => {
					return [...acc, ...licenseArr];
				}, [])
				.filter(onlyUnique),
		};
	}, {});

	// Check for unlicenses modules, these need to be manually verified, then they can be ignored.
	const unlicensed = Object.keys(uniqueLicenses).filter((moduleName) => uniqueLicenses[moduleName].length === 0);
	if (unlicensed.length > 0) {
		console.error(`${unlicensed.length} unlicensed modules found:\n${unlicensed.join('\n')}`);
		process.exit(1);
	}

	// Check for licenses that aren't in the allowed list
	const notAllowed = Object.entries(uniqueLicenses)
		// ignore the unlicensed modules
		.filter(([module]) => unlicensed.indexOf(module) === -1)
		// find all modules that don't have a license from the allow list
		.filter(
			([, licenseList]) => licenseList.filter((licenseName) => licenseAllowList.indexOf(licenseName) !== -1).length < 1,
		)
		.reduce((acc, [module, licenseList]) => ({ ...acc, [module]: licenseList }), {});

	if (Object.keys(notAllowed).length > 0) {
		const printable = Object.entries(notAllowed).map(([mod, licenseList]) => `${mod}: ${licenseList.join(', ')}`);
		console.error(
			`${Object.keys(notAllowed).length} modules found with licenses that aren't allow:\n${printable.join('\n')}`,
		);
		process.exit(1);
	}
})();

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

import { Image } from '@nitric/boxygen';
import tinyGlob from 'tiny-glob';

// Base image for maven builds
export const MAVEN_BASE = 'maven:3-openjdk-11';

export const mavenBuild = async (image: Image): Promise<void> => {
	const pomFiles = await tinyGlob('**/pom.xml', {
		cwd: image.workspace.context,
	});

	// assume single module
	let moduleDirs = ['src/'];
	if (pomFiles.length > 1) {
		moduleDirs = pomFiles.filter((f) => f !== 'pom.xml').map((f) => f.replace('pom.xml', ''));
	}

	pomFiles.forEach((f) => {
		image.copy(f, `./${f}`);
	});

	image.run(['mvn', 'de.qaware.maven:go-offline-maven-plugin:resolve-dependencies']);

	moduleDirs.forEach((d) => {
		image.copy(d, `./${d}`);
	});

	image.run(['mvn', 'clean', 'package']);
};

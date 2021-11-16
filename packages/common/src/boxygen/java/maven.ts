import { Image } from '@nitric/boxygen';
import tinyGlob from 'tiny-glob';

// Base image for maven builds
export const MAVEN_BASE = 'maven:3-openjdk-11';

export const mavenBuild = async (image: Image): Promise<void> => {
	const pomFiles = await tinyGlob('**/pom.xml', {
		cwd: image.workspace.context,
	});

	// assume single modules
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

import { Image } from '@nitric/boxygen';

export const MAVEN_IGNORE = ['target/'];

export const mavenBuild = async (image: Image): Promise<void> => {
	image
		// TODO: We will actually need to copy more than one pom
		// for multi module builds
		.copy('pom.xml', 'pom.xml')
		.run(['mvn', 'de.qaware.maven:go-offline-maven-plugin:resolve-dependencies'])
		.copy('./src', './src')
		.run(['mnv clean package']);
};

export const javaFinal =
	(handler: string, baseImage: Image) =>
	async (image: Image): Promise<void> => {
		image.copy(handler, 'function.jar', { from: baseImage }).config({
			workDir: '/',
			ports: [9001],
			cmd: ['java', '-jar', 'function.jar'],
		});
	};

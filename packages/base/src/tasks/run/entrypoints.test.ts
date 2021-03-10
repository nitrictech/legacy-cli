//import jest from "jest";
import { Stack, Site } from '@nitric/cli-common';
import * as EPS from './entrypoints';
import fs from 'fs';
import Docker from 'dockerode';
import tar from 'tar-fs';
import { Readable } from 'stream';

beforeAll(() => {
	jest.mock('dockerode');
	jest.mock('fs');
	jest.mock('tar-fs');
});

// Catch all to ensure our mocks don't leak into other tests.
afterAll(() => {
	jest.restoreAllMocks();
});

const ASYNC_NO_OP = async (): Promise<any> => {
	// NO_OP
};

describe('createNginxConfig', () => {
	describe('Given a stack with no entrypoints', () => {
		const stack = new Stack('nitric.yaml', {
			name: 'dummy-stack',
		});
		it('Should throw an error', () => {
			expect(() => EPS.createNginxConfig(stack)).toThrowError('Cannot create nginx config for stack with no entrypoints');
		});
	});

	describe('Given a stack with a site entrypoint', () => {
		const stack = new Stack('nitric.yaml', {
			name: 'dummy-stack',
			entrypoints: {
				'/': {
					name: 'test',
					type: 'site',
				},
			},
		});

		it('Should describe an nginx config with a root entrypoint', () => {
			const config = EPS.createNginxConfig(stack);

			expect(config).toContain(`
				location / {
					root /www/test;
				}
			`);
		});
	});

	describe('Given a stack with a api entrypoint', () => {
		const stack = new Stack('nitric.yaml', {
			name: 'dummy-stack',
			entrypoints: {
				'/': {
					name: 'test',
					type: 'api',
				},
			},
		});

		it('Should describe an nginx config with a proxy_pass entrypoint', () => {
			const config = EPS.createNginxConfig(stack);

			expect(config).toContain(`
				location / {
					proxy_pass http://dummy-stack-test:8080;
				}
			`);
		});
	});
});

// Stage the nginx config
describe('stageStackEntrypoints', () => {
	let writeFileSpy: jest.SpyInstance;
	beforeAll(() => {
		writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation(() => Promise.resolve());
	});

	afterAll(() => {
		writeFileSpy.mockRestore();
	});

	describe('given any nginx config & stack', () => {
		const stack = new Stack('nitric.yaml', {
			name: 'dummy-stack',
			entrypoints: {
				'/': {
					name: 'test',
					type: 'api',
				},
			},
		});
		// TODO: We should probably mock this out...
		const config = EPS.createNginxConfig(stack);

		beforeAll(() => {
			EPS.stageStackEntrypoint(stack, config);
		});

		it('should write it to the stacks staging directory', () => {
			expect(writeFileSpy).toBeCalledTimes(1);
		});

		it('should write to the stacks staging directory', () => {
			expect(writeFileSpy).toBeCalledWith(`${stack.getStagingDirectory()}/nginx.conf`, expect.anything());
		});

		it('should write the provided nginx config', () => {
			expect(writeFileSpy).toBeCalledWith(expect.anything(), config);
		});
	});
});

describe('RunEntrypointsTask', () => {
	let createContainerMock: jest.SpyInstance;
	let followProgressMock: jest.SpyInstance;
	// let networkInspectMock: jest.SpyInstance;
	let putArchiveMock: jest.SpyInstance;
	let containerExecMock: jest.SpyInstance;
	let containerStartMock: jest.SpyInstance;
	let tarPackMock: jest.SpyInstance;
	let siteBuildMock: jest.SpyInstance;
	let pullContainerMock: jest.SpyInstance;
	//let stageStackConfigMock: jest.SpyInstance;
	let writeFileSpy: jest.SpyInstance;
	let execStartMock: jest.SpyInstance;
	let mockDocker: Docker;

	// Establish our mocks
	beforeAll(() => {
		mockDocker = new Docker();
		mockDocker.modem = {
			followProgress: (_, onFinish, __): any => {
				onFinish();
			},
		};
		//stageStackConfigMock = jest.spyOn(EPS, 'stageStackEntrypoint').mockReturnValue(Promise.resolve());
		putArchiveMock = jest.fn();
		containerStartMock = jest.fn();
		execStartMock = jest.fn();
		containerExecMock = jest.fn().mockReturnValue(
			Promise.resolve({
				start: execStartMock,
			}),
		);
		writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation(() => Promise.resolve());
		siteBuildMock = jest.spyOn(Site, 'build').mockImplementation(ASYNC_NO_OP);
		tarPackMock = jest.spyOn(tar, 'pack').mockReturnValue((Readable as any).from(['test']));
		createContainerMock = jest.spyOn(Docker.prototype, 'createContainer').mockReturnValue(
			Promise.resolve({
				putArchive: putArchiveMock,
				start: containerStartMock,
				exec: containerExecMock,
			} as any),
		);

		pullContainerMock = jest.spyOn(Docker.prototype, 'pull').mockReturnValue(Promise.resolve());
	});

	afterAll(() => {
		createContainerMock.mockRestore();
		followProgressMock.mockRestore();
		//stageStackConfigMock.mockRestore();
		//networkInspectMock.mockRestore();
		putArchiveMock.mockRestore();
		pullContainerMock.mockRestore();
		containerExecMock.mockRestore();
		containerStartMock.mockRestore();
		tarPackMock.mockRestore();
		siteBuildMock.mockRestore();
		writeFileSpy.mockRestore();
	});

	describe('given a simple stack with a single entrypoint', () => {
		const testStack = new Stack('nitric.yaml', {
			name: 'test',
			sites: [
				{
					name: 'test',
					path: 'test',
				},
			],
			entrypoints: {
				'/': {
					name: 'test',
					type: 'site',
				},
			},
		});

		// Do a single run of the run entrypoints task
		beforeAll(async () => {
			await new EPS.RunEntrypointsTask({
				port: 1234,
				docker: mockDocker,
				stack: testStack,
			}).do();
		});

		it('should create a new nginx docker container', () => {
			expect(createContainerMock).toBeCalledTimes(1);
			expect(createContainerMock).toBeCalledWith(
				expect.objectContaining({
					name: 'test-entrypoints',
					Image: 'nginx',
				}),
			);
		});

		it('should tarball the nginx config', () => {
			expect(tarPackMock).toBeCalled();
			expect(tarPackMock).toBeCalledWith('/home/tim/.nitric/staging/test', { entries: ['nginx.conf'] });
		});

		it('should push the nginx config to the new container', () => {
			expect(putArchiveMock).toBeCalled();
			expect(putArchiveMock).nthCalledWith(1, expect.anything(), expect.objectContaining({ path: '/etc/nginx/' }));
		});

		it('should start the nginx container', () => {
			expect(containerStartMock).toBeCalledTimes(1);
		});

		it('should build the configured stack sites', () => {
			expect(siteBuildMock).toBeCalledTimes(1);
		});

		it('should pack the build sites', () => {
			// This is the asset path of the site (see above)
			expect(tarPackMock).toBeCalledWith('test');
		});

		it('should push the sites to the nginx container', () => {
			expect(putArchiveMock).nthCalledWith(2, expect.anything(), expect.objectContaining({ path: '/www/test' }));
		});
	});
});

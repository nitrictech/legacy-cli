//import jest from "jest";
import { Stack } from "@nitric/cli-common";
import { createNginxConfig, stageStackEntrypoint } from "./entrypoints";
import fs from 'fs';
import Docker from 'dockerode';

describe('createNginxConfig', () => {
	describe('Given a stack with no entrypoints', () => {
		const stack = new Stack("nitric.yaml", {
			name: "dummy-stack",
		});
		it("Should throw an error", () => {
			expect(() => createNginxConfig(stack)).toThrowError(
				'Cannot create nginx config for stack with no entrypoints'
			);
		});
	});

	describe('Given a stack with a site entrypoint', () => {
		const stack = new Stack("nitric.yaml", {
			name: "dummy-stack",
			entrypoints: {
				"/": {
					name: 'test',
					type: 'site'
				}
			}
		});

		it("Should describe an nginx config with a root entrypoint", () => {
			const config = createNginxConfig(stack);

			expect(config).toContain(`
				location / {
					root /www/test;
				}
			`);
		});
	});

	describe('Given a stack with a api entrypoint', () => {
		const stack = new Stack("nitric.yaml", {
			name: "dummy-stack",
			entrypoints: {
				"/": {
					name: 'test',
					type: 'api'
				}
			}
		});

		it("Should describe an nginx config with a proxy_pass entrypoint", () => {
			const config = createNginxConfig(stack);

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
		const stack = new Stack("nitric.yaml", {
			name: "dummy-stack",
			entrypoints: {
				"/": {
					name: 'test',
					type: 'api'
				}
			}
		});
		// TODO: We should probably mock this out...
		const config = createNginxConfig(stack);

		beforeAll(() => {
			stageStackEntrypoint(stack, config);
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
	let networkInspectMock: jest.SpyInstance;
	let putArchiveMock: jest.SpyInstance;
	let containerExecMock: jest.SpyInstance;
	let containerStartMock: jest.SpyInstance;
	let getPortMock: jest.SpyInstance;
	let tarPackMock: jest.SpyInstance;

	// Establish our mocks
	beforeAll(() => {
		putArchiveMock = jest.fn();
		containerStartMock = jest.fn();
		containerExecMock = jest.fn();
		createContainerMock = jest.spyOn(Docker.prototype, 'createContainer')
			.mockReturnValue(Promise.resolve({
				putArchive: putArchiveMock,
				start: containerStartMock,
				exec: containerExecMock,
			} as any));
		followProgressMock = jest.spyOn(Docker.prototype.modem, 'followProgress')
			.mockImplementation(() => {
				// TODO: Call finish right away...
			})
		// Mostly dockerode mocking here...
	});

	afterAll(() => {
		createContainerMock.mockRestore();
		followProgressMock.mockRestore();
		networkInspectMock.mockRestore();
		putArchiveMock.mockRestore();
		containerExecMock.mockRestore();
		containerStartMock.mockRestore();
		getPortMock.mockRestore();
		tarPackMock.mockRestore();
	});

	describe("given a simple stack with a single entrypoint", () => {

	});
});
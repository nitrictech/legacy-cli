import 'jest';
import { RunGatewayTask } from '.';
import Docker, { Container } from 'dockerode';
import getPort from 'get-port';
import { NitricAPI } from '@nitric/cli-common';

jest.mock('get-port');
jest.mock('fs');
jest.mock('dockerode');
jest.mock('../../utils');

afterAll(() => {
	jest.restoreAllMocks();
});

const MOCK_API: NitricAPI = {
	name: 'test',
	openapi: '3.0.0',
	info: {
		title: 'test',
		version: '1',
	},
	paths: {},
};

describe('GatewayRunTask', () => {
	let createContainerSpy: jest.SpyInstance;
	let pullSpy: jest.SpyInstance;

	beforeAll(() => {
		pullSpy = jest.spyOn(Docker.prototype, 'pull').mockResolvedValue(
			Promise.resolve()
		);

		createContainerSpy = jest.spyOn(Docker.prototype, 'createContainer').mockResolvedValue(
			Promise.resolve({
				start: jest.fn(),
				putArchive: jest.fn(),
			} as any),
		);
	});

	describe('when minimal options are provided', () => {
		let container: Container;

		beforeAll(async () => {
			container = await new RunGatewayTask({ stackName: 'test', api: MOCK_API, docker: new Docker() }).do();
		});

		it('should pull the dev-api-gateway container', () => {
			expect(pullSpy).toBeCalledTimes(1);
			expect(pullSpy).toBeCalledWith('nitricimages/dev-api-gateway');
		})

		it('should generate a port', async () => {
			expect(getPort).toHaveBeenCalled();
		});

		it('should create a single docker container', () => {
			expect(createContainerSpy).toHaveBeenCalledTimes(1);
		});

		it('should start the created container', () => {
			expect(container.start).toHaveBeenCalled();
		});

		it('should upload the api to the created container', () => {
			expect(container.putArchive).toHaveBeenCalled();
		});

		it('should use default bridge network', () => {
			expect(createContainerSpy.mock.calls[0][0].HostConfig.NetworkMode).toEqual('bridge');
		});
	});
});

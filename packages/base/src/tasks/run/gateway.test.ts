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

import 'jest';
import { RunGatewayTask } from '.';
import Docker, { Container } from 'dockerode';
import getPort from 'get-port';
import { NamedObject, NitricAPI } from '@nitric/cli-common';
import _ from 'stream-to-promise';

jest.mock('get-port');
jest.mock('fs');
jest.mock('dockerode');
jest.mock('../../utils');
jest.mock('stream-to-promise', () => ({
	__esModule: true, // this property makes it work
	default: async (): Promise<void> => {
		/* NOOP */
	},
}));

afterAll(() => {
	jest.restoreAllMocks();
});

const MOCK_API: NamedObject<NitricAPI> = {
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
		pullSpy = jest.spyOn(Docker.prototype, 'pull').mockResolvedValue(Promise.resolve());

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
			container = await new RunGatewayTask({
				stackName: 'test',
				api: MOCK_API,
				docker: new Docker(),
				runId: 'test-run',
			}).do();
		});

		it('should pull the dev-api-gateway source', () => {
			expect(pullSpy).toBeCalledTimes(1);
			expect(pullSpy).toBeCalledWith('nitricimages/dev-api-gateway');
		});

		it('should generate a port', async () => {
			expect(getPort).toHaveBeenCalled();
		});

		it('should create a single docker source', () => {
			expect(createContainerSpy).toHaveBeenCalledTimes(1);
		});

		it('should start the created source', () => {
			expect(container.start).toHaveBeenCalled();
		});

		it('should upload the api to the created source', () => {
			expect(container.putArchive).toHaveBeenCalled();
		});

		it('should use default bridge network', () => {
			expect(createContainerSpy.mock.calls[0][0].HostConfig.NetworkMode).toEqual('bridge');
		});
	});
});

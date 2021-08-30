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
import { mocked } from 'ts-jest/utils';
import { RunContainerTask, Cleanup } from '.';
import Docker, { Network } from 'dockerode';

jest.mock('get-port');
jest.mock('fs');
jest.mock('dockerode');
jest.mock('../../utils');

describe('Given a Nitric function is being run locally as a source', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	let runCallback;
	const mockRunImpl = async (_, __, ___, ____, callback): Promise<any> => {
		runCallback = callback;
		return {
			on: jest.fn((_, callback) => {
				callback({
					id: '11111111111111',
				});
			}),
		} as any;
	};

	test('A source image should be created', async () => {
		expect.assertions(1);
		const runContainerTask = new RunContainerTask({
			image: {
				id: 'test-id',
				name: 'test-function',
			},
			runId: 'test-run',
			// port: 3000, network: '', subscriptions: '', volume: '',
		});

		const mockInstance = mocked(Docker, true).mock.instances[0];
		const mockRun = mocked(mockInstance.run, true);
		mockRun.mockImplementation(mockRunImpl);

		await runContainerTask.do();
		expect(mockRun).toBeCalled();
	});

	describe('When docker run takes too long to respond', () => {
		test('The task promise should reject with details', () => {
			const runContainerTask = new RunContainerTask({
				image: {
					id: 'test-id',
					name: 'test-function',
				},
				runId: 'test-run',
				// port: 3000, network: '', subscriptions: '', volume: '',
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(async (_, __, ___, ____, callback): Promise<any> => {
				runCallback = callback;
				return {
					on: jest.fn((_, __) => {
						// never call the callback, simulating delayed start/failure.
					}),
				} as any;
			});

			return expect(runContainerTask.do()).rejects.toEqual(
				new Error(`Container for image test-id not started after 2 seconds.`),
			);
		});
	});

	describe('When the source finishes running', () => {
		let logSpy;
		beforeAll(() => {
			console.log = jest.fn();
			logSpy = jest.spyOn(console, 'log');
		});

		const runConfig = {
			image: {
				id: 'test-id',
				name: 'test-function',
			},
			runId: 'test-run',
		};

		test('The status code should be logged', async () => {
			expect.assertions(1);
			const runContainerTask = new RunContainerTask(runConfig);

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runContainerTask.do();
			runCallback(null, { StatusCode: 'dummy status' }, null);
			expect(logSpy).toBeCalledWith('test-function - test-id exited with status code: dummy status');
		});

		test('An error should be logged if it occurs', async () => {
			expect.assertions(1);
			const runContainerTask = new RunContainerTask(runConfig);

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runContainerTask.do();
			runCallback('dummy error', null, null);
			expect(logSpy).toBeCalledWith('dummy error');
		});
	});

	describe('When a custom docker network is set', () => {
		test('The network config should be passed to Docker', async () => {
			expect.assertions(1);
			const runContainerTask = new RunContainerTask({
				image: {
					id: 'test-id',
					name: 'test-function',
				},
				network: {
					inspect: async () => {
						return {
							Name: 'dummy-network',
						};
					},
				} as any,
				runId: 'test-run',
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runContainerTask.do();
			expect(mockRun).toBeCalledWith(
				expect.anything(),
				expect.anything(),
				undefined,
				expect.objectContaining({
					HostConfig: expect.objectContaining({
						NetworkMode: 'dummy-network',
					}),
				}),
				expect.anything(),
			);
		});

		describe("When its details can't be retrieved from the docker daemon", () => {
			let warnSpy;
			beforeAll(() => {
				console.warn = jest.fn();
				warnSpy = jest.spyOn(console, 'warn');
			});

			test('A warning should be logged', async () => {
				expect.assertions(1);
				const runContainerTask = new RunContainerTask({
					image: {
						id: 'test-id',
						name: 'test-function',
					},
					// port: 3000,
					network: new Network(null, 'dummy-network'),
					runId: 'test-run',
					// subscriptions: '',
					// volume: '',
				});

				const mockInstance = mocked(Docker, true).mock.instances[0];
				const mockRun = mocked(mockInstance.run, true);
				mockRun.mockImplementation(mockRunImpl);

				await runContainerTask.do();
				expect(warnSpy).toBeCalledWith('Failed to set custom docker network, defaulting to bridge network');
			});

			test('The bridge network should be used instead', async () => {
				expect.assertions(1);
				const runContainerTask = new RunContainerTask({
					image: {
						id: 'test-id',
						name: 'test-function',
					},
					// port: 3000,
					network: new Network(null, 'dummy-network'),
					runId: 'test-run',
					// subscriptions: '',
					// volume: '',
				});

				const mockInstance = mocked(Docker, true).mock.instances[0];
				const mockRun = mocked(mockInstance.run, true);
				mockRun.mockImplementation(mockRunImpl);

				await runContainerTask.do();
				expect(mockRun).toBeCalledWith(
					expect.anything(),
					expect.anything(),
					undefined,
					expect.objectContaining({
						HostConfig: expect.objectContaining({
							NetworkMode: 'bridge',
						}),
					}),
					expect.anything(),
				);
			});
		});
	});

	describe('When a docker volume is provided', () => {
		test('The volume config should be passed to Docker', async () => {
			expect.assertions(1);
			const runContainerTask = new RunContainerTask({
				image: {
					id: 'test-id',
					name: 'test-function',
				},
				// port: 3000, subscriptions: '', volume: '',
				volume: {
					name: 'dummy-volume',
				} as any,
				runId: 'test-run',
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runContainerTask.do();
			expect(mockRun).toBeCalledWith(
				expect.anything(),
				expect.anything(),
				undefined,
				expect.objectContaining({
					Volumes: {
						['/nitric/']: {},
					},
					HostConfig: expect.objectContaining({
						Mounts: [
							{
								Target: '/nitric/',
								Source: 'dummy-volume',
								Type: 'volume',
							},
						],
					}),
				}),
				expect.anything(),
			);
		});
	});
});

describe('Placeholder for Cleanup Task', () => {
	it('runs', () => {
		return expect(new Cleanup('dummy cleanup').do()).resolves.toBe(undefined);
	});
});

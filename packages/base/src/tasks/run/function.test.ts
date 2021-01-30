import 'jest';
import { mocked } from 'ts-jest/utils';
import { RunFunctionTask, Cleanup } from '.';
import Docker, { Network } from 'dockerode';

jest.mock('get-port');
jest.mock('fs');
jest.mock('dockerode');
jest.mock('../../utils');

describe('Given a Nitric function is being run locally as a container', () => {
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

	test('A container image should be created', async () => {
		expect.assertions(1);
		const runFunctionTask = new RunFunctionTask({
			image: {
				id: 'test-id',
				func: {
					name: 'test-function',
					path: 'test-function-path',
					runtime: 'dummy' as any,
				},
			},
			// port: 3000, network: '', subscriptions: '', volume: '',
		});

		const mockInstance = mocked(Docker, true).mock.instances[0];
		const mockRun = mocked(mockInstance.run, true);
		mockRun.mockImplementation(mockRunImpl);

		await runFunctionTask.do();
		expect(mockRun).toBeCalled();
	});

	describe('When docker run takes too long to respond', () => {
		test('The task promise should reject with details', () => {
			const runFunctionTask = new RunFunctionTask({
				image: {
					id: 'test-id',
					func: {
						name: 'test-function',
						path: 'test-function-path',
						runtime: 'dummy' as any,
					},
				},
				// port: 3000, network: '', subscriptions: '', volume: '',
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(
				async (_, __, ___, ____, callback): Promise<any> => {
					runCallback = callback;
					return {
						on: jest.fn((_, __) => {
							// never call the callback, simulating delayed start/failure.
						}),
					} as any;
				},
			);

			return expect(runFunctionTask.do()).rejects.toEqual(
				new Error(`Container for image test-id not started after 2 seconds.`),
			);
		});
	});

	describe('When the container finishes running', () => {
		let logSpy;
		beforeAll(() => {
			console.log = jest.fn();
			logSpy = jest.spyOn(console, 'log');
		});

		const runConfig = {
			image: {
				id: 'test-id',
				func: {
					name: 'test-function',
					path: 'test-function-path',
					runtime: 'dummy' as any,
				},
			},
		};

		test('The status code should be logged', async () => {
			expect.assertions(1);
			const runFunctionTask = new RunFunctionTask(runConfig);

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runFunctionTask.do();
			runCallback(null, { StatusCode: 'dummy status' }, null);
			expect(logSpy).toBeCalledWith('Status: dummy status');
		});

		test('An error should be logged if it occurs', async () => {
			expect.assertions(1);
			const runFunctionTask = new RunFunctionTask(runConfig);

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runFunctionTask.do();
			runCallback('dummy error', null, null);
			expect(logSpy).toBeCalledWith('dummy error');
		});
	});

	describe('When a custom docker network is set', () => {
		test('The network config should be passed to Docker', async () => {
			expect.assertions(1);
			const runFunctionTask = new RunFunctionTask({
				image: {
					id: 'test-id',
					func: {
						name: 'test-function',
						path: 'test-function-path',
						runtime: 'dummy' as any,
					},
				},
				network: {
					inspect: async () => {
						return {
							Name: 'dummy-network',
						};
					},
				} as any,
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runFunctionTask.do();
			expect(mockRun).toBeCalledWith(
				expect.anything(),
				expect.anything(),
				undefined,
				expect.objectContaining({
					HostConfig: {
						NetworkMode: 'dummy-network',
					},
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
				const runFunctionTask = new RunFunctionTask({
					image: {
						id: 'test-id',
						func: {
							name: 'test-function',
							path: 'test-function-path',
							runtime: 'dummy' as any,
						},
					},
					// port: 3000,
					network: new Network(null, 'dummy-network'),
					// subscriptions: '',
					// volume: '',
				});

				const mockInstance = mocked(Docker, true).mock.instances[0];
				const mockRun = mocked(mockInstance.run, true);
				mockRun.mockImplementation(mockRunImpl);

				await runFunctionTask.do();
				expect(warnSpy).toBeCalledWith('Failed to set custom docker network, defaulting to bridge network');
			});

			test('The bridge network should be used instead', async () => {
				expect.assertions(1);
				const runFunctionTask = new RunFunctionTask({
					image: {
						id: 'test-id',
						func: {
							name: 'test-function',
							path: 'test-function-path',
							runtime: 'dummy' as any,
						},
					},
					// port: 3000,
					network: new Network(null, 'dummy-network'),
					// subscriptions: '',
					// volume: '',
				});

				const mockInstance = mocked(Docker, true).mock.instances[0];
				const mockRun = mocked(mockInstance.run, true);
				mockRun.mockImplementation(mockRunImpl);

				await runFunctionTask.do();
				expect(mockRun).toBeCalledWith(
					expect.anything(),
					expect.anything(),
					undefined,
					expect.objectContaining({
						HostConfig: {
							NetworkMode: 'bridge',
						},
					}),
					expect.anything(),
				);
			});
		});
	});

	describe('When a docker volume is provide', () => {
		test('The volume config should be passed to Docker', async () => {
			expect.assertions(1);
			const runFunctionTask = new RunFunctionTask({
				image: {
					id: 'test-id',
					func: {
						name: 'test-function',
						path: 'test-function-path',
						runtime: 'dummy' as any,
					},
				},
				// port: 3000, subscriptions: '', volume: '',
				volume: {
					name: 'dummy-volume',
				} as any,
			});

			const mockInstance = mocked(Docker, true).mock.instances[0];
			const mockRun = mocked(mockInstance.run, true);
			mockRun.mockImplementation(mockRunImpl);

			await runFunctionTask.do();
			expect(mockRun).toBeCalledWith(
				expect.anything(),
				expect.anything(),
				undefined,
				expect.objectContaining({
					Volumes: {
						['/nitric/']: {},
					},
					HostConfig: {
						Mounts: [
							{
								Target: '/nitric/',
								Source: 'dummy-volume',
								Type: 'volume',
							},
						],
					},
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
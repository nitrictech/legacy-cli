import 'jest';
import { mocked } from 'ts-jest/utils';
import { RunFunctionTask } from '../../../src/tasks/run';
import Docker, { Network } from 'dockerode';

jest.mock('get-port');
jest.mock('fs');
jest.mock('dockerode');
jest.mock('../../../src/utils');

describe('Given a Nitric function is being run locally as a container', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

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
		mockRun.mockImplementation(
			async () =>
				({
					on: jest.fn((_, callback) => {
						callback({
							id: '11111111111111',
						});
					}),
				} as any),
		);

		await runFunctionTask.do();
		expect(mockRun).toBeCalled();
	});

	describe('When a custom docker network fails to get set', () => {
		let warnSpy;
		beforeAll(() => {
			console.warn = jest.fn();
			warnSpy = jest.spyOn(console, 'warn');
		});

		test('Should raise a warning that the default network is being used instead', async () => {
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
			// const mockOnContainer = jest.fn();
			mockRun.mockImplementation(
				async () =>
					({
						on: jest.fn((_, callback) => {
							callback({
								id: '11111111111111',
							});
						}),
					} as any),
			);

			await runFunctionTask.do();
			expect(warnSpy).toBeCalledWith('Failed to set custom docker network, defaulting to bridge network');
		});
	});
});

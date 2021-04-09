import 'jest';
import { mocked } from 'ts-jest/utils';
// import Run, { MIN_PORT, MAX_PORT, getPortRange, getContainerSubscriptions, sortImages } from './run';
import { MIN_PORT, MAX_PORT, getPortRange, getContainerSubscriptions, sortImages } from './run';
// import { RunFunctionTask } from '../tasks/run';
import * as getPort from 'get-port';
// import * as clicommon from '@nitric/cli-common';
import { Listr } from 'listr2';
import { NitricImage, NitricStack } from '@nitric/cli-common';

jest.mock('dockerode');
jest.mock('get-port');
jest.mock('cli-ux', () => ({
	action: {
		start: (): void => {
			return;
		},
		stop: (): void => {
			return;
		},
	},
	table: (): void => {
		return;
	},
}));
jest.mock('listr2');
jest.mock('../tasks/run');
jest.mock('../tasks/build');

// We want to ensure tests fail if these constant values are unintentionally changed
describe('Given MIN_PORT is constant', () => {
	it.skip('should have value 49152', () => {
		expect(MIN_PORT).toBe(49152);
	});
});

describe('Given MAX_PORT is constant', () => {
	it('should have value 65535', () => {
		expect(MAX_PORT).toBe(65535);
	});

	it('should be greater than MIN_PORT', () => {
		expect(MAX_PORT).toBeGreaterThan(MIN_PORT);
	});
});

describe('Given getPortRange', () => {
	afterAll(() => {
		jest.restoreAllMocks();
	});

	let makeRangeSpy;
	beforeEach(() => {
		makeRangeSpy = jest.spyOn(getPort, 'makeRange');
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('When no start and end is specified', () => {
		it('Should generate the default port range', () => {
			getPortRange();
			expect(makeRangeSpy).toBeCalledWith(MIN_PORT, MAX_PORT);
		});
	});

	describe('When a start, but no end is specified', () => {
		describe(`and startPort is less than ${MAX_PORT}`, () => {
			it('should return an iterable from provided startPort and MAX_PORT', () => {
				getPortRange(1024);
				expect(makeRangeSpy).toBeCalledWith(1024, MAX_PORT);
			});
		});

		describe(`and startPort is greater than ${MAX_PORT}`, () => {
			it('should throw an exception', () => {
				expect(() => getPortRange(MAX_PORT + 1)).toThrow();
			});
		});
	});

	describe('When an end, but no start is specified', () => {
		describe(`and endPort is greater than ${MIN_PORT}`, () => {
			it('should return an iterable from provided MIN_PORT and endPort', () => {
				getPortRange(undefined, MIN_PORT + 1);
				expect(makeRangeSpy).toBeCalledWith(MIN_PORT, MIN_PORT + 1);
			});
		});

		describe(`and endPort is less than ${MIN_PORT}`, () => {
			it('should throw an exception', () => {
				expect(() => getPortRange(undefined, MIN_PORT - 1)).toThrow();
			});
		});
	});

	describe('When both a start and end are specified', () => {
		describe(`and startPort is less than endPort`, () => {
			it('should return an iterable containing the specified start and end ports', () => {
				const BASE_PORT = 3000;
				getPortRange(BASE_PORT, BASE_PORT + 1);
				expect(makeRangeSpy).toBeCalledWith(BASE_PORT, BASE_PORT + 1);
			});
		});

		describe(`and startPort is greater than endPort`, () => {
			it('should throw and exception', () => {
				const BASE_PORT = 3000;
				expect(() => getPortRange(BASE_PORT, BASE_PORT - 1)).toThrow();
			});
		});
	});
});

describe('Given executing nitric run', () => {
	const results: string[] = [];

	beforeAll(() => {
		jest.spyOn(process.stdin, 'on').mockImplementation(jest.fn());
		process.stdin.setRawMode = jest.fn();
		jest.spyOn(process.stdin, 'resume').mockImplementation(jest.fn());
		jest.spyOn(process.stdin, 'pause').mockImplementation(jest.fn());
		jest.spyOn(process.stdout, 'write').mockImplementation((str) => !!results.push(str));

		// Mock listr2 for the BuildFunctionTask
		mocked(Listr, true).mockImplementationOnce(
			(tasks): Listr<unknown> => {
				(tasks! as Array<any>).forEach((element) => {
					element.task();
				});
				return {
					run: () => {
						// no need to run.
						return [
							{
								func: {
									name: 'dummy-func',
								},
							},
						];
					},
				} as any;
			},
		);

		// Mock listr for all other tasks, provide the context object, since it's used to get the network and volume to mount to containers
		mocked(Listr, true).mockImplementation(
			(tasks): Listr<unknown> => {
				(tasks! as Array<any>).forEach((element) => {
					element.task({ network: 'dummy-network', volume: 'dummy-volume' });
				});
				return {
					run: () => {
						// no need to run.
						return {
							network: 'dummy-network',
						};
					},
				} as any;
			},
		);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	// describe('Given a nitric stack with a single function', () => {
	// 	beforeAll(() => {
	// 		jest.spyOn(clicommon, 'readNitricDescriptor').mockReturnValue({
	// 			name: 'dummy-stack',
	// 			functions: [
	// 				{
	// 					name: 'dummy-func',
	// 					runtime: 'custom',
	// 					path: 'dummy-func',
	// 				},
	// 			],
	// 		});
	// 	});

	// 	describe("When running nitric run in it's directory", () => {
	// 		beforeAll(async () => {
	// 			// execute run
	// 			await Run.run(['./mock-project']);
	// 		});

	// 		afterAll(jest.resetAllMocks);

	// 		it('Should create a single RunFunctionTask', () => {
	// 			expect(RunFunctionTask).toBeCalledTimes(1);
	// 		});

	// 		it.skip('Should create run function task from nitric.yaml function properties', () => {
	// 			expect(RunFunctionTask).toBeCalledWith(
	// 				expect.objectContaining({
	// 					// image: "",
	// 					port: MIN_PORT,
	// 					// network:
	// 					// volume:
	// 					subscriptions: undefined,
	// 				}),
	// 			);
	// 		});

	// 		it('Should execute the RunFunctionTask', async () => {
	// 			expect(RunFunctionTask).toBeCalled();
	// 		});
	// 	});
	// });

	describe('Given a nitric stack with multiple functions', () => {
		const multiFunctionStack: NitricStack = {
			name: 'test-stack',
			functions: [
				{
					name: 'dummy-func1',
					runtime: 'custom',
					path: 'dummy-func1',
				},
				{
					name: 'dummy-func2',
					runtime: 'custom',
					path: 'dummy-func2',
				},
			],
		};

		describe('Given an event topic', () => {
			const eventTopicStack: NitricStack = {
				...multiFunctionStack,
				// add the topic
				topics: [
					{
						name: 'test-topic',
					},
				],
			};

			describe('When one function has a subscription', () => {
				const subscribedStack: NitricStack = {
					name: eventTopicStack.name,
					functions: [
						{
							...eventTopicStack.functions![0],
							// add the subscription
							subs: [
								{
									topic: 'test-topic',
								},
							],
						},
						eventTopicStack.functions![1],
					],
					topics: eventTopicStack.topics,
				};

				it('Should subscribe the function', () => {
					const subscriptions = getContainerSubscriptions(subscribedStack);
					expect(subscriptions).toEqual({
						'test-topic': ['http://dummy-func1:9001'],
					});
				});
			});
		});
	});

	describe('Given multiple nitric images', () => {
		it('Should sort the images by name their function alphabetical function names', () => {
			const unsortedImages: NitricImage[] = [
				{
					id: '1111',
					func: {
						name: 'a-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'c-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'same-name',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'same-name',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'b-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
			];
			expect(sortImages(unsortedImages)).toEqual([
				{
					id: '1111',
					func: {
						name: 'a-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'b-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'c-function',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'same-name',
						path: './some-path',
						runtime: 'custom',
					},
				},
				{
					id: '1111',
					func: {
						name: 'same-name',
						path: './some-path',
						runtime: 'custom',
					},
				},
			]);
		});
	});
});

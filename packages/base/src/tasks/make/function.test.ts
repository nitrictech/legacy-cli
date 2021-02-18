import 'jest';
// import { MakeFunctionTask } from '../../tasks/make';
// import { Repository, Template } from '../../templates';
// import { Stack } from '@nitric/cli-common';

it.skip('placeholder', () => {
	return;
});

// afterEach(() => {
// 	jest.resetAllMocks();
// });

// afterAll(() => {
// 	jest.restoreAllMocks();
// });

// describe('Given MakeFunctionTask without dir provided', () => {
// 	const task = new MakeFunctionTask({
// 		template: '',
// 		name: 'function-name',
// 	});
// 	it('Should default dir to normalized function name', () => {
// 		expect(task.dir).toBe('function-name');
// 	});
// });

// describe('Given a non-loadable stack', () => {
// 	beforeEach(() => {
// 		Stack.fromFile = jest.fn().mockRejectedValueOnce(new Error('mock error'));
// 	});

// 	describe('When calling MakeFunctionTask.do', () => {
// 		it('Should fail', async () => {
// 			await expect(
// 				new MakeFunctionTask({
// 					template: 'dummy-repo/dummy-template',
// 					dir: '.',
// 					name: 'my-fake-function',
// 				}).do(),
// 			).rejects.toThrowError('mock error');
// 		});
// 	});
// });

// describe('Given a loadable stack', () => {
// 	describe('And a function can be added', () => {
// 		const addFuncSpy = jest.fn();
// 		beforeEach(async () => {
// 			Stack.fromFile = jest.fn().mockResolvedValueOnce({
// 				addFunction: addFuncSpy,
// 				asNitricStack: jest.fn().mockRejectedValueOnce({} as any),
// 			});

// 			Stack.write = jest.fn();

// 			Repository.fromDefaultDirectory = jest.fn().mockReturnValueOnce([
// 				{
// 					getName: jest.fn().mockReturnValue('dummy-repo'),
// 					getTemplate: jest.fn(),
// 				} as any,
// 			]);

// 			Template.copyCodeTo = jest.fn().mockResolvedValueOnce(undefined as void);
// 		});

// 		it('Should call stack.addFunction', async () => {
// 			await new MakeFunctionTask({
// 				template: 'dummy-repo/dummy-template',
// 				dir: './functions/my-new-function',
// 				name: 'my-fake-function',
// 				file: './nitric.yaml',
// 			}).do();

// 			expect(addFuncSpy).toBeCalledTimes(1);
// 			expect(addFuncSpy).toBeCalledWith({
// 				name: 'my-fake-function',
// 				path: 'functions/my-new-function',
// 				runtime: 'dummy-repo/dummy-template',
// 			});
// 		});

// 		describe('When the repository is not available', () => {
// 			it('should fail', async () => {
// 				await expect(
// 					new MakeFunctionTask({
// 						template: 'missing-repo/dummy-template',
// 						dir: './functions/my-new-function',
// 						name: 'my-fake-function',
// 						file: './nitric.yaml',
// 					}).do(),
// 				).rejects.toThrowError('Repository missing-repo is not available');
// 			});
// 		});
// 	});
// });

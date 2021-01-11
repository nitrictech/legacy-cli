import 'jest';
import Function from '../../../src/commands/make/function';
import { MakeFunctionTask } from '../../../src/tasks/make';
import inquirer from 'inquirer';
import * as utils from '../../../src/utils';

jest.mock('../../../src/tasks/make');
jest.mock('../../../src/utils');
jest.mock('inquirer');
jest.mock('listr');

describe('Given executing nitric make:function', () => {
	let result;

	beforeEach(() => {
		result = [];
		jest.spyOn(process.stdout, 'write').mockImplementation((val) => result.push(val));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('When required args are provided', () => {
		test('The args should be used to call MakeFunctionTask', async () => {
			await Function.run(['dummy-template', 'dummy-function']);
			expect(MakeFunctionTask).toBeCalledWith(
				expect.objectContaining({
					template: 'dummy-template',
					name: 'dummy-function',
				}),
			);
			expect(inquirer.prompt).toBeCalledWith([]); // an empty array generates no user prompts
		});
	});

	describe("When required args aren't provided", () => {
		beforeEach(() => {
			Function.args.find((arg) => arg.name == 'template')!.choices = ['dummy-template'];
			jest.spyOn(utils, 'getAvailableTemplates').mockReturnValue(['dummy-template']);
			// Return something from the prompt so the rest of the code doesn't error
			jest.spyOn(inquirer, 'prompt').mockReturnValue({
				name: 'dummy-function',
				template: 'dummy-template',
			});
		});

		test('The user is prompted for the args', async () => {
			await Function.run([]);
			expect(inquirer.prompt).toBeCalledWith(
				expect.objectContaining([
					{
						name: 'template',
						type: 'list',
					},
					{
						name: 'name',
						type: 'string',
					},
				]),
			);
		});

		test('The args provided from the prompt args are used to call MakeFunctionTask', async () => {
			await Function.run([]);
			expect(MakeFunctionTask).toBeCalledWith(
				expect.objectContaining({
					template: 'dummy-template',
					name: 'dummy-function',
				}),
			);
		});
	});
});

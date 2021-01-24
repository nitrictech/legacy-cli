import 'jest';
import Project from './project';
import * as utils from '../../utils';
import inquirer from 'inquirer';

jest.mock('../../tasks/make');
jest.mock('../../utils');
jest.mock('inquirer');
jest.mock('listr');

describe('Given executing nitric make:project', () => {
	let result;

	beforeEach(() => {
		result = [];
		jest.spyOn(process.stdout, 'write').mockImplementation((val) => result.push(val));
		jest.spyOn(utils, 'getAvailableTemplates').mockReturnValue(['dummytemplate']);
	});

	afterEach(() => jest.restoreAllMocks());

	describe('When a valid project name is provided', () => {
		beforeEach(() => {
			jest.spyOn(inquirer, 'prompt').mockReturnValue({ example: 'none' });
		});

		test('User should be asked if they want to include an example function', async () => {
			expect.assertions(1);
			await Project.run(['test-project']);
			expect(inquirer.prompt).toBeCalled();
		});

		describe('When an example is requested', () => {
			beforeEach(() => {
				jest.spyOn(inquirer, 'prompt').mockReturnValueOnce({ example: 'dummytemplate' });
			});

			test('User should be prompted for function name', async () => {
				expect.assertions(2);
				await Project.run(['test-project']);
				expect(inquirer.prompt).toBeCalled();
				expect(inquirer.prompt).toBeCalledWith([
					{
						name: 'functionName',
						message: 'Name for the example function?',
						type: 'input',
					},
				]);
			});
		});
	});

	describe('When an invalid project name is provided', () => {
		test('An error should be raised', async () => {
			expect.assertions(1);
			try {
				await Project.run(['invalid name because of spaces']);
			} catch (error) {
				expect(error.message.replace('\n', ' ')).toContain(
					'project name must be lowercase letters and dashes only. e.g. example-project-name',
				);
			}
		});
	});

	describe('When no project name is provided', () => {
		test('An error should be raised', async () => {
			expect.assertions(1);
			try {
				await Project.run([]);
			} catch (error) {
				expect(error.message.replace('\n', ' ')).toContain('Missing 1 required arg: name');
			}
		});
	});
});

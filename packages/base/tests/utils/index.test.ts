import 'jest';
// import * as os from 'os';
import '../../src/utils';
import { createNitricLogDir, getAvailableTemplates, isTemplateAvailable } from '../../src/utils';
import fs from 'fs';

jest.mock('fs');

afterEach(() => {
	jest.restoreAllMocks();
});

describe('Given templates are availabe in the template directory', () => {
	beforeEach(() => {
		jest.spyOn(fs, 'readdirSync').mockReturnValue([
			{
				name: 'dummytemplate',
				isDirectory: () => true,
			} as any,
			{
				name: 'seconddummytemplate',
				isDirectory: () => true,
			} as any,
		]);
	});

	describe('When getAvailableTemplates is called', () => {
		test('The list of templates should be returned', () => {
			expect(getAvailableTemplates()).toEqual(['dummytemplate', 'seconddummytemplate']);
		});
	});

	describe('When calling isTemplateAvailable', () => {
		describe('When the template is available', () => {
			beforeEach(() => {
				jest.spyOn(fs, 'existsSync').mockReturnValue(true);
			});

			test('true is returned', () => {
				expect(isTemplateAvailable('available-template')).toBe(true);
			});
		});
		describe("When the template isn't available", () => {
			beforeEach(() => {
				jest.spyOn(fs, 'existsSync').mockReturnValue(false);
			});

			test('false is returned', () => {
				expect(isTemplateAvailable('unavailable-template')).toBe(false);
			});
		});
		describe('When an error occurs while looking for the template', () => {
			test.skip('The error should be handled?', () => {
				//todo
			});
		});
	});
});

describe('Given no templates are available in the template directory', () => {
	beforeEach(() => {
		jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
	});

	describe('When getAvailableTemplates is called', () => {
		test('An empty list should be returned', () => {
			expect(getAvailableTemplates().length).toEqual(0);
		});
	});
});

describe("Given the nitric log file doesn't exist", () => {
	describe('When createNitricLogDir is called', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		});

		test('the nitric log directory should be created', () => {
			createNitricLogDir();
			expect(fs.mkdirSync).toBeCalled();
		});
	});
});

describe('Given functions need a unique log output file', () => {
	describe('When functionLogFilePath is called', () => {
		test.skip('A log dir is provided based on the function name', () => {
			// expect(functionLogFilePath('funky')).toEqual('/Users/test/.nitric/logs/funky');
		});
	});
});

import 'jest';
import * as utils from '.';
import fs from 'fs';

jest.mock('fs');

afterEach(() => {
	jest.restoreAllMocks();
});

describe("Given the nitric log file doesn't exist", () => {
	describe('When createNitricLogDir is called', () => {
		beforeEach(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		});

		test('the nitric log directory should be created', () => {
			utils.createNitricLogDir();
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

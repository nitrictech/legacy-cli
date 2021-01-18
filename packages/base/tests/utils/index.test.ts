import 'jest';
// import * as os from 'os';
import * as utils from '../../src/utils';
// import { createNitricLogDir, getAvailableTemplates, isTemplateAvailable } from '../../src/utils';
import fs from 'fs';
import { NitricTemplateRepository } from '../../src/common/types';
import YAML from 'yaml';

jest.mock('fs');

afterEach(() => {
	jest.restoreAllMocks();
});

describe('Given templates are available in the template directory', () => {
	beforeEach(() => {
		jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
			// Return the mocked file...
			if (path.toString().includes("dummyrepo")) {
				return Buffer.from(YAML.stringify({
					name: "dummyrepo",
					templates: [{
						name: "dummytemplate",
						path: "templates/dummtemplate"
					}, {
						name: "seconddummytemplate",
						path: "templates/seconddummytemplate"
					}]
				} as NitricTemplateRepository))
			}

			throw new Error("ENOENT: No such file");
		})

		jest.spyOn(fs, 'readdirSync').mockReturnValue([
			{
				name: 'dummyrepo',
				isDirectory: () => true,
			} as any,
		]);
	});

	describe('When getAvailableTemplates is called', () => {
		test('The list of templates should be returned', () => {
			expect(utils.getAvailableTemplates()).toEqual(['dummyrepo/dummytemplate', 'dummyrepo/seconddummytemplate']);
		});
	});

	describe('When calling isTemplateAvailable', () => {
		describe('When the template is available', () => {
			beforeEach(() => {
				jest.spyOn(fs, 'existsSync').mockReturnValue(true);
			});

			test('true is returned', () => {
				expect(utils.isTemplateAvailable('dummyrepo/dummytemplate')).toBe(true);
			});
		});
		describe("When the template isn't available", () => {
			beforeEach(() => {
				jest.spyOn(fs, 'existsSync').mockReturnValue(false);
			});

			test('false is returned', () => {
				expect(utils.isTemplateAvailable('unavailable-template')).toBe(false);
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
			expect(utils.getAvailableTemplates().length).toEqual(0);
		});
	});
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

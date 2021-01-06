import 'jest';
import fs from 'fs';
import YAML from 'yaml';
import { MakeFunctionTask } from '../src/tasks/make';

jest.mock('fs');

describe('Given executing nitric make:function', () => {
	jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
		return YAML.stringify({
			name: 'My stack',
		});
	});

	describe(`When the requested template does not exist`, () => {
		jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'test',
					file: 'nitric.yaml',
				}).do();
			}).rejects.toThrowError('Template dummy is not available');
		});
	});

	describe('When the function name already exists', () => {
		let spy;

		beforeAll(() => {
			spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		});
		afterAll(() => {
			spy.mockRestore();
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'test',
					file: 'nitric.yaml',
				}).do();
			}).rejects.toThrowError('Function directory already exists: any');
		});
	});
});

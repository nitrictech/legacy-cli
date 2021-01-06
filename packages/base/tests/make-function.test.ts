import 'jest';
import fs from 'fs';
import YAML from 'yaml';
import { MakeFunctionTask } from '../src/tasks/make';

describe('Given executing nitric make:function', () => {
	describe(`When the requested template does not exist`, () => {
		jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
			return YAML.stringify({
				name: 'My stack',
			});
		});

		jest.spyOn(fs, 'existsSync').mockImplementation(() => {
			// Cause failure on template existence
			return false;
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'test',
					file: 'nitric.yaml',
				}).do();
			}).rejects.toThrowError();
		});
	});
});

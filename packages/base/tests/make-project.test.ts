import 'jest';
import fs from 'fs';
import { MakeProjectTask } from '../src/tasks/make';

jest.mock('fs');

describe('Given executing nitric make:project', () => {
	describe("When the project folder doesn't exist", () => {
		test('The new project directory is created', async () => {
			await new MakeProjectTask('test-project', true).do();
			expect(fs.mkdirSync).toBeCalledWith('./test-project');
		});
	});

	describe(`When the project folder exists`, () => {
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
			throw new Error('file already exists');
		});

		test('An error is returned when create not forced', async () => {
			// Set 'force' parameter to false.
			await expect(new MakeProjectTask('test-project', false).do()).rejects.toThrowError();
		});

		test('nitric.yaml is written when forced', async () => {
			// Set 'force' parameter to true.
			await expect(new MakeProjectTask('test-project', true).do()).resolves.toBe(undefined);
			expect(fs.writeFileSync).toBeCalledWith(
				'./test-project/nitric.yaml',
				Buffer.from('name: test-project\n', 'utf-8'),
			);
		});
	});
});

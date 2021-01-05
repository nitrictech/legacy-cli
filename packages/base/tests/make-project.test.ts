import 'jest';
import fs from 'fs';
import { MakeProjectTask } from '../src/tasks/make';

describe('Given executing nitric make:project', () => {
	describe(`When the project folder exists`, () => {
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
			throw new Error('file already exists');
		});

		test('An error is returned when create not forced', () => {
			expect(async () => {
				await new MakeProjectTask('test-project', true).do();
			}).rejects.toThrowError();
		});
	});
});

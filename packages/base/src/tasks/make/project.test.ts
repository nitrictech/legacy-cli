// Copyright 2021, Nitric Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import 'jest';
import fs from 'fs';
import { MakeProjectTask } from '../../tasks/make';

jest.mock('fs');

describe('MakeProjectTask: ', () => {
	describe("When the project folder doesn't exist", () => {
		test('The new project directory is created', async () => {
			await new MakeProjectTask('test-project', true).do();
			expect(fs.mkdirSync).toBeCalledWith('./test-project');
		});
	});

	describe(`When the project folder exists`, () => {
		let spy;
		beforeAll(() => {
			spy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
				throw new Error('file already exists');
			});
		});

		afterAll(() => {
			spy.mockRestore();
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

	describe(`When an unexpected error occurs writing the project folder`, () => {
		let spy;
		beforeAll(() => {
			spy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
				throw new Error('test error');
			});
		});

		afterAll(() => {
			spy.mockRestore();
		});

		test('The unexpected error is re-thrown', async () => {
			// Set 'force' parameter to false.
			await expect(new MakeProjectTask('test-project', false).do()).rejects.toThrowError('test error');
		});
	});

	describe(`When a valid project name is provided`, () => {
		test('the project is created when letters, numbers and dashes are used in the name', async () => {
			await expect(new MakeProjectTask('test-project42', false).do()).resolves.toBe(undefined);
		});
	});

	describe(`When an invalid project name is provided`, () => {
		const errorString = 'Invalid project name, only letters, numbers and dashes are supported.';

		describe(`When symbols are used in the name`, () => {
			test('an error is thrown', async () => {
				return expect(new MakeProjectTask('Test / Project', false).do()).rejects.toThrowError(errorString);
			});
		});

		describe(`When the name starts with a dash`, () => {
			test('an error is thrown', async () => {
				await expect(new MakeProjectTask('-test-project', false).do()).rejects.toThrowError(errorString);
			});
		});

		describe(`When the name ends with a dash`, () => {
			test('an error is thrown', async () => {
				await expect(new MakeProjectTask('test-project-', false).do()).rejects.toThrowError(errorString);
			});
		});

		describe(`When two dashes are used in a row in the name`, () => {
			test('an error is thrown', async () => {
				await expect(new MakeProjectTask('test--project', false).do()).rejects.toThrowError(errorString);
			});
		});
	});
});

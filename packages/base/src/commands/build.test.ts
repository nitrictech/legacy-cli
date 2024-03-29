// Copyright 2021, Nitric Technologies Pty Ltd.
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
// import * as clicommon from '@nitric/cli-common';
// import Build from './build';
// import Listr from 'listr';
// import { mocked } from 'ts-jest/utils';

jest.mock('@nitric/cli-common');
jest.mock('listr2');

describe('Given executing nitric build', () => {
	let result;

	beforeEach(() => {
		result = [];
		jest.spyOn(process.stdout, 'write').mockImplementation((val) => result.push(val));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it.skip('placeholder', () => {
		return;
	});

	// describe('When an error occurs while running tasks', () => {
	// 	beforeAll(() => {
	// 		mocked(Listr, true).mockImplementationOnce(
	// 			(_): Listr<unknown> => {
	// 				return {
	// 					run: () => {
	// 						throw new Error('test error');
	// 					},
	// 				} as any;
	// 			},
	// 		);
	// 		jest.spyOn(clicommon, 'readNitricDescriptor').mockReturnValue({
	// 			name: 'dummy-stack',
	// 			functions: [
	// 				{
	// 					name: 'dummy-func',
	// 					runtime: 'custom',
	// 					path: 'dummy-func',
	// 				},
	// 			],
	// 		});
	// 	});

	// 	afterAll(() => {
	// 		jest.restoreAllMocks();
	// 	});

	// 	test('The user should be notified that something went wrong', () => {
	// 		return expect(Build.run([])).rejects.toEqual(
	// 			new Error('Something went wrong, see error details inline above.\n Error: test error'),
	// 		);
	// 	});
	// });

	// describe("When the provider flag isn't set", () => {
	// 	beforeAll(() => {
	// 		mocked(Listr, true).mockImplementationOnce(
	// 			(tasks): Listr<unknown> => {
	// 				(tasks! as Array<any>).forEach((element) => {
	// 					element.task();
	// 				});
	// 				return {
	// 					run: () => {
	// 						// no need to run.
	// 					},
	// 				} as any;
	// 			},
	// 		);
	// 		jest.spyOn(clicommon, 'readNitricDescriptor').mockReturnValue({
	// 			name: 'dummy-stack',
	// 			functions: [
	// 				{
	// 					name: 'dummy-func',
	// 					runtime: 'custom',
	// 					path: 'dummy-func',
	// 				},
	// 			],
	// 		});
	// 	});

	// 	afterAll(() => {
	// 		jest.restoreAllMocks();
	// 	});

	// 	test('The local provider should be assumed', async () => {
	// 		expect.assertions(1);
	// 		await await Build.run([]);
	// 		expect(BuildFunctionTask).toBeCalledWith(
	// 			expect.objectContaining({
	// 				provider: 'local',
	// 			}),
	// 		);
	// 	});
	// });

	// describe("When the directory arg isn't provided", () => {
	// 	beforeAll(() => {
	// 		jest.spyOn(clicommon, 'readNitricDescriptor').mockImplementation(() => {
	// 			throw new Error('test error');
	// 		});
	// 	});

	// 	test('The current directory should be assumed', async () => {
	// 		expect.assertions(1);
	// 		try {
	// 			await Build.run([]);
	// 		} catch (_) {
	// 			//ignore the error
	// 		}
	// 		expect(clicommon.readNitricDescriptor).toBeCalledWith('nitric.yaml');
	// 	});
	// });

	// describe('When the directory arg is provided', () => {
	// 	beforeAll(() => {
	// 		jest.spyOn(clicommon, 'readNitricDescriptor').mockImplementation(() => {
	// 			throw new Error('test error');
	// 		});
	// 	});

	// 	test('The directory should be used to find the Nitric file', async () => {
	// 		expect.assertions(1);
	// 		try {
	// 			await Build.run(['/fake/location']);
	// 		} catch (_) {
	// 			//ignore the error
	// 		}
	// 		expect(clicommon.readNitricDescriptor).toBeCalledWith('/fake/location/nitric.yaml');
	// 	});
	// });
});

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
// import Function from './function';
// import { MakeFunctionTask } from '../../tasks/make';
// import inquirer from 'inquirer';
// // import * as utils from '../../utils';

// jest.mock('../../tasks/make');
// jest.mock('../../utils');
// jest.mock('inquirer');
// jest.mock('listr');

it.skip('placeholder', () => {
	return;
});

// describe('Given executing nitric make:function', () => {
// 	let result;

// 	beforeEach(() => {
// 		result = [];
// 		jest.spyOn(process.stdout, 'write').mockImplementation((val) => result.push(val));
// 	});

// 	afterEach(() => {
// 		jest.resetAllMocks();
// 	});

// 	describe('When required args are provided', () => {
// 		test('The args should be used to call MakeFunctionTask', async () => {
// 			await Function.run(['dummy-template', 'dummy-function']);
// 			expect(MakeFunctionTask).toBeCalledWith(
// 				expect.objectContaining({
// 					template: 'dummy-template',
// 					name: 'dummy-function',
// 				}),
// 			);
// 			expect(inquirer.prompt).toBeCalledWith([]); // an empty array generates no user prompts
// 		});
// 	});

// describe("When required args aren't provided", () => {
// 	beforeEach(() => {
// 		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// 		Function.args.find((arg) => arg.name == 'template')!.choices = ['dummy-template'];
// 		jest.spyOn(utils, 'getAvailableTemplates').mockReturnValue(['dummy-template']);
// 		// Return something from the prompt so the rest of the code doesn't error
// 		jest.spyOn(inquirer, 'prompt').mockReturnValue({
// 			name: 'dummy-function',
// 			template: 'dummy-template',
// 		});
// 	});

// 	test('The user is prompted for the args', async () => {
// 		await Function.run([]);
// 		expect(inquirer.prompt).toBeCalledWith(
// 			expect.objectContaining([
// 				{
// 					name: 'template',
// 					type: 'list',
// 				},
// 				{
// 					name: 'name',
// 					type: 'string',
// 				},
// 			]),
// 		);
// 	});

// 	test('The args provided from the prompt args are used to call MakeFunctionTask', async () => {
// 		await Function.run([]);
// 		expect(MakeFunctionTask).toBeCalledWith(
// 			expect.objectContaining({
// 				template: 'dummy-template',
// 				name: 'dummy-function',
// 			}),
// 		);
// 	});
// });
// });

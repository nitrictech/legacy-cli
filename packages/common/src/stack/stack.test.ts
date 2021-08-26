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

import { promises } from 'fs';
import { Stack } from './stack';
import * as utils from '../utils';

jest.mock('../utils/index');
describe('Preserve Comments', () => {
	let writeSpy: jest.SpyInstance;

	beforeAll(() => {
		jest.mock('fs');

		writeSpy = jest.spyOn(promises, 'writeFile').mockReturnValue(
			new Promise((resolve) => {
				resolve();
			}),
		);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('Given a YAML stack file with comments', async () => {
		let readSpy: jest.SpyInstance;
		const fileWithComments = `# This is an example stack with comments
name: example-stack
services:
  # service comment
  customer-create:
    # map prop comment
    path: customer-create # inline prop comment
    runtime: function/nodets12
  customer-log:
    path: customer-log
    runtime: function/nodets12
    triggers:
      topics:
        # list comment
        - customer # inline list comment
topics:
  # topic for customer events
  customer: {}
`;

		beforeAll(() => {
			jest.mock('fs');
			readSpy = jest.spyOn(utils, 'findFileRead').mockReturnValue(
				new Promise((resolve) => {
					resolve({ content: fileWithComments, filePath: 'test-path.yaml' });
				}),
			);
		});

		describe('When reading and writing the stack', () => {
			beforeAll(async () => {
				const stack = await Stack.fromFile(fileWithComments);
				await Stack.writeTo(stack, 'testfile.yaml');
			});

			it('Should read the file', () => {
				expect(readSpy).toBeCalledTimes(1);
			});

			it('Should not modify the file', () => {
				expect(writeSpy).toBeCalledWith('testfile.yaml', fileWithComments);
			});
		});
	});
});

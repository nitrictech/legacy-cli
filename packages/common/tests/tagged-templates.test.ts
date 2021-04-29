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

import { block } from '../src/utils';

describe('Tagged template utilities', () => {
	describe('When using the block tagged template', () => {
		test(`The result should be be surrounded by new lines`, () => {
			expect(block`My testing sentence`).toBe('\nMy testing sentence\n');
		});
	});

	describe('When using the block tagged template with keys', () => {
		test(`The result should be be surrounded by new lines`, () => {
			const name = 'John';
			const lastName = 'Doe';
			expect(block`My testing sentence by ${name} ${lastName}`).toBe('\nMy testing sentence by John Doe\n');
		});
	});
});

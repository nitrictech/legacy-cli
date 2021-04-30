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

import { ListTemplatesTask } from './list';
import { Repository, Template } from '@nitric/cli-common';

afterAll(() => {
	jest.restoreAllMocks();
});

describe('ListTemplatesTask: ', () => {
	describe('Given repos are available', () => {
		beforeAll(() => {
			Repository.fromDefaultDirectory = jest.fn().mockReturnValueOnce([
				{
					getName: (): string => {
						return 'repo1';
					},
					getTemplates: (): Template[] => {
						return [
							{
								getName: (): string => {
									return 'template1';
								},
							} as any,
						];
					},
				},
			]);
		});

		it('Should list the repository names', async () => {
			const result = await new ListTemplatesTask().do();
			expect(result).toEqual({
				repo1: ['template1'],
			});
		});
	});

	describe("Given repos aren't available", () => {
		beforeAll(() => {
			Repository.fromDefaultDirectory = jest.fn().mockReturnValueOnce([]);
		});

		it('Should return an empty object', async () => {
			const result = await new ListTemplatesTask().do();
			expect(result).toEqual({});
		});
	});

	describe('Given retrieving repos returns an error', () => {
		beforeAll(() => {
			Repository.fromDefaultDirectory = jest.fn().mockImplementationOnce(() => {
				throw new Error('mock repos error');
			});
		});

		it('Should return an empty object', async () => {
			await expect(new ListTemplatesTask().do()).rejects.toEqual(new Error('mock repos error'));
		});
	});
});

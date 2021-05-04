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

import { AddRepositoryTask } from './add';
import { Store, Repository } from '@nitric/cli-common';

describe('AddRepositoryTask', () => {
	describe("Given the nitric default store contains an 'official' repository", () => {
		let defaultStoreSpy: jest.SpyInstance;
		beforeAll(() => {
			// Mock the nitric repository stored here...
			defaultStoreSpy = jest.spyOn(Store, 'fromDefault').mockReturnValue(
				new Store({
					official: {
						location: 'https://test-location.test',
					},
				}),
			);
		});

		afterAll(() => {
			defaultStoreSpy.mockRestore();
		});

		describe("When adding a custom repository with the alias 'official'", () => {
			it('Should throw an error', async () => {
				await expect(
					new AddRepositoryTask({
						alias: 'official',
						url: 'http://my-fake-repo',
					}).do(),
				).rejects.toThrowError('Alias exists as a reserved name in the nitric store, please use a different name');
			});
		});

		describe('When adding a custom repository under a custom alias', () => {
			let repositoryCheckoutMock: jest.SpyInstance;
			beforeAll(() => {
				repositoryCheckoutMock = jest
					.spyOn(Repository, 'checkout')
					.mockReturnValue(Promise.resolve(new Repository('testName', 'testPath', [])));
			});

			afterAll(() => {
				repositoryCheckoutMock.mockRestore();
			});

			it('Should successfully add the repository', async () => {
				await expect(
					new AddRepositoryTask({
						alias: 'my-repo',
						url: 'http://my-fake-repo',
					}).do(),
				).resolves.toBe(undefined);
			});
		});

		describe('When adding a repository for an alias that does not exist', () => {
			it('Should throw an error', async () => {
				await expect(
					new AddRepositoryTask({
						alias: 'official2',
					}).do(),
				).rejects.toThrowError('Repository official2 not found in store');
			});
		});
	});
});

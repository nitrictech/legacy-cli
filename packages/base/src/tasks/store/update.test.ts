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

import { UpdateStoreTask } from './update';
import { Store } from '@nitric/cli-common';

jest.mock('fs');
jest.mock('rimraf');

afterAll(() => {
	jest.restoreAllMocks();
});

describe('UpdateStoreTask', () => {
	let checkoutDefaultStoreSpy: jest.SpyInstance;
	beforeAll(() => {
		checkoutDefaultStoreSpy = jest.spyOn(Store, 'checkoutDefault').mockReturnValue(Promise.resolve(new Store({})));
	});

	afterAll(() => {
		checkoutDefaultStoreSpy.mockRestore();
	});

	it('Should checkout the default store', async () => {
		await expect(new UpdateStoreTask().do()).resolves.toBe(undefined);
		expect(checkoutDefaultStoreSpy).toHaveBeenCalledTimes(1);
	});
});

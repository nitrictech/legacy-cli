import { UpdateStoreTask } from './update';
import { Store } from '../../templates';

jest.mock('fs');
jest.mock('rimraf');

afterAll(() => {
	jest.restoreAllMocks();
});

describe('UpdateStoreTask', () => {
	let checkoutDefaultStoreSpy: jest.SpyInstance;
	beforeAll(() => {
		checkoutDefaultStoreSpy = jest.spyOn(Store, 'checkoutDefault').mockReturnValue(Promise.resolve(
			new Store({})
		));
	});

	afterAll(() => {
		checkoutDefaultStoreSpy.mockRestore();
	});

	it("Should checkout the default store", async () => {
		await expect(new UpdateStoreTask().do()).resolves.toBe(undefined);
		expect(checkoutDefaultStoreSpy).toHaveBeenCalledTimes(1);
	});
});

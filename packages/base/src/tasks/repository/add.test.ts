import { AddRepositoryTask } from './add';
import { Store, Repository } from '../../templates';

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

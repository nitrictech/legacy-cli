import { ListTemplatesTask } from './list';
import { Repository, Template } from '../../templates';

afterAll(() => {
	jest.restoreAllMocks();
});

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

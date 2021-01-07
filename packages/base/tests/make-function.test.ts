import 'jest';
import fs from 'fs';
import tar from 'tar-fs';
import * as clicommon from '@nitric/cli-common';
import { MakeFunctionTask } from '../src/tasks/make';
// import tar from 'tar-fs';
jest.mock('fs');
jest.mock('tar-fs');
jest.mock('stream-to-promise');

// import { NitricStack } from '@nitric/cli-common';

describe('Given executing nitric make:function', () => {
	let spyReadNitricDescriptor;
	beforeEach(() => {
		spyReadNitricDescriptor = jest.spyOn(clicommon, 'readNitricDescriptor').mockReturnValue({
			name: 'test-project',
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('When the make:function inputs are all valid', () => {
		let spyExistsSync;
		let spyWriteNitricDesc;
		beforeAll(() => {
			spyExistsSync = jest
				.spyOn(fs, 'existsSync')
				.mockReturnValueOnce(true) // template exists
				.mockReturnValueOnce(false); // function dir doesn't

			spyWriteNitricDesc = jest.spyOn(clicommon, 'writeNitricDescriptor');

			jest.spyOn(tar, 'pack').mockReturnValue({ pipe: jest.fn() } as any);
		});

		test('The function is created', async () => {
			expect.assertions(2);

			await new MakeFunctionTask({
				template: 'dummy',
				dir: 'test',
				name: 'test',
			}).do();

			expect(spyExistsSync).toBeCalledTimes(2);
			expect(spyWriteNitricDesc).toBeCalledWith(
				{
					name: 'test-project',
					functions: [
						// Newly added function
						{
							name: 'test',
							path: 'test',
							runtime: 'dummy',
						},
					],
				},
				expect.any(String),
			);
		});
	});

	describe('When the make:function is provided an alternate nitric.yaml filename', () => {
		let spyWriteNitricDesc;
		beforeEach(() => {
			jest
				.spyOn(fs, 'existsSync')
				.mockReturnValueOnce(true) // template exists
				.mockReturnValueOnce(false); // function dir doesn't
			spyWriteNitricDesc = jest.spyOn(clicommon, 'writeNitricDescriptor');
			jest.spyOn(tar, 'pack').mockReturnValue({ pipe: jest.fn() } as any);
		});

		const altNameInput = {
			template: 'dummy',
			dir: 'test',
			name: 'test',
			file: 'another-name.yaml',
		};

		test('The custom filename is used to load the existing configuration', async () => {
			expect.assertions(1);
			await new MakeFunctionTask(altNameInput).do();
			expect(spyReadNitricDescriptor).toBeCalledWith('another-name.yaml');
		});

		test('The custom filename is used to save the new configuration', async () => {
			expect.assertions(1);
			await new MakeFunctionTask(altNameInput).do();
			expect(spyWriteNitricDesc).toBeCalledWith(expect.any(Object), 'another-name.yaml');
		});
	});

	describe(`When the requested template does not exist`, () => {
		beforeAll(() => {
			jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'test',
				}).do();
			}).rejects.toThrowError('Template dummy is not available');
		});
	});

	describe('When the function directory already exists', () => {
		let spy;

		beforeAll(() => {
			spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		});
		afterAll(() => {
			spy.mockRestore();
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'test',
				}).do();
			}).rejects.toThrowError('Function directory already exists: any');
		});
	});

	describe('When the function name already exists in the YAML file', () => {
		// let spyExistsSync;

		beforeAll(() => {
			spyReadNitricDescriptor.mockReturnValueOnce({
				name: 'test-project',
				functions: [
					{
						name: 'existingfunction',
						path: 'existingfunction',
						runtime: 'dummy' as any,
					},
				],
			});

			jest
				.spyOn(fs, 'existsSync')
				.mockReturnValueOnce(true) // template exists
				.mockReturnValueOnce(false); // function dir doesn't
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'dummy',
					dir: 'any',
					name: 'existingfunction',
				}).do();
			}).rejects.toThrowError('Function existingfunction already defined in ./nitric.yaml');
		});
	});
});

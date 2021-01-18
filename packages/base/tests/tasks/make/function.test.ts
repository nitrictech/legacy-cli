import 'jest';
import fs from 'fs';
import tar from 'tar-fs';
import * as clicommon from '@nitric/cli-common';
// import * as utils from '../../../src/utils';
import { MakeFunctionTask } from '../../../src/tasks/make';
import YAML from "yaml";

jest.mock('fs');
jest.mock('tar-fs');
jest.mock('stream-to-promise');

describe('Given executing nitric make:function', () => {
	let spyReadNitricDescriptor;
	beforeEach(() => {
		spyReadNitricDescriptor = jest.spyOn(clicommon, 'readNitricDescriptor').mockReturnValue({
			name: 'test-project',
		});

		jest.spyOn(fs, 'existsSync').mockImplementation(path => {
			// return true if it's related to the template and template paths
			if (path.toString().includes("dummy") || path.toString().includes("repository.yaml")) {
				return true;
			} else {
				// return false for anything else
				return false;
			}
		});

		jest.spyOn(tar, 'pack').mockImplementation(() => {
			return { pipe: jest.fn() } as any
		});
		
		jest.spyOn(fs, 'readFileSync').mockImplementation(path => {
			const pathString = path.toString();
			// return a mock version of the template repository in the case where it is requests
			if (pathString.includes('repository.yaml')) {
				return Buffer.from(YAML.stringify({
					name: 'test',
					templates: [
						{
							name: 'dummy',
							path: '/templates/dummy',
							lang: 'dummy',
							codeDir: '/function',
						},
					],
				}));
			}

			throw new Error("ENOENT: No such file");
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	afterAll(() => {
		jest.restoreAllMocks()
	})

	describe('When the make:function inputs are all valid', () => {
		let spyWriteNitricDesc;
		beforeAll(() => {
			spyWriteNitricDesc = jest.spyOn(clicommon, 'writeNitricDescriptor');
		});

		test('The function is created', async () => {
			await new MakeFunctionTask({
				template: 'test/dummy',
				dir: 'test',
				name: 'test',
			}).do();

			expect(spyWriteNitricDesc).toBeCalledWith(
				{
					name: 'test-project',
					functions: [
						// Newly added function
						{
							name: 'test',
							path: 'test',
							runtime: 'test/dummy',
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
			spyWriteNitricDesc = jest.spyOn(clicommon, 'writeNitricDescriptor');
		});

		const altNameInput = {
			template: 'test/dummy',
			dir: 'test',
			name: 'test',
			file: 'another-name.yaml',
		};

		test('The custom filename is used to load the existing configuration', async () => {
			await new MakeFunctionTask(altNameInput).do();
			expect(spyReadNitricDescriptor).toBeCalledWith('another-name.yaml');
		});

		test('The custom filename is used to save the new configuration', async () => {
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

		beforeEach(() => {
			spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		});
		afterEach(() => {
			spy.mockRestore();
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'test/dummy',
					dir: 'any',
					name: 'test',
				}).do();
			}).rejects.toThrowError('Function directory already exists: any');
		});
	});

	describe('When the function name already exists in the YAML file', () => {
		// let spyExistsSync;

		beforeEach(() => {
			spyReadNitricDescriptor.mockReturnValueOnce({
				name: 'test-project',
				functions: [
					{
						name: 'existingfunction',
						path: 'existingfunction',
						runtime: 'test/dummy' as any,
					},
				],
			});

			// jest
			// 	.spyOn(fs, 'existsSync')
			// 	.mockReturnValueOnce(true) // template exists
			// 	.mockReturnValueOnce(false); // function dir doesn't
		});

		test('An error should be thrown', () => {
			return expect(async () => {
				await new MakeFunctionTask({
					template: 'test/dummy',
					dir: 'any',
					name: 'existingfunction',
				}).do();
			}).rejects.toThrowError('Function existingfunction already defined in ./nitric.yaml');
		});
	});
});

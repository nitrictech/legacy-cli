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

import 'jest';
import Doctor from './doctor';
import which from 'which';
import fs from 'fs';
import cli from 'cli-ux';
import { Preferences } from '@nitric/cli-common';
import { InstallPulumi, InstallDocker } from '../tasks/doctor';

beforeAll(() => {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	Preferences.requiresInit = () => false;
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	Preferences.fromDefault = async () =>
		new Preferences({
			analyticsEnabled: false,
		});
});

describe('Doctor Command:', () => {
	let tableSpy: jest.SpyInstance;
	let infoSpy: jest.SpyInstance;

	beforeAll(() => {
		jest.mock('cli-ux');
		jest.mock('fs');
		jest.mock('which');
		jest.mock('inquirer');
		jest.mock('@nitric/cli-common');
		jest.mock('../tasks/doctor');

		tableSpy = jest.spyOn(cli, 'table').mockReturnValue();
		infoSpy = jest.spyOn(cli, 'info').mockReturnValue();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('Given all required software is already installed', () => {
		// Setup the mocks
		let whichSpy: jest.SpyInstance;

		beforeAll(() => {
			whichSpy = jest.spyOn(which, 'sync').mockReturnValue(['/usr/bin/test']); // Installed.
		});

		afterAll(() => {
			whichSpy.mockReset();
			tableSpy.mockReset();
			infoSpy.mockReset();
		});

		describe('When calling `nitric doctor`', () => {
			// Run the command
			beforeAll(async () => {
				await new Doctor([], null as any).run();
			});

			it('Should check the software is installed', () => {
				expect(whichSpy).toBeCalledTimes(2); // Pulumi, Docker
			});

			it('Should list the software', () => {
				expect(tableSpy).toBeCalled();
			});

			it("Should say 'Good to go'", () => {
				expect(infoSpy).toBeCalledWith(expect.stringContaining('Good to go 👍 Enjoy using Nitric 🎉'));
			});
		});
	});

	describe("Given the required software isn't installed", () => {
		// Setup the mocks
		let whichSpy: jest.SpyInstance;
		let fsSpy: jest.SpyInstance;
		let confirmSpy: jest.SpyInstance;

		beforeAll(() => {
			whichSpy = jest.spyOn(which, 'sync').mockReturnValue(null); // Not installed.
			fsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
			confirmSpy = jest.spyOn(cli, 'confirm');
		});

		afterAll(() => {
			whichSpy.mockReset();
			fsSpy.mockReset();
			tableSpy.mockReset();
			infoSpy.mockReset();
			confirmSpy.mockReset();
		});

		describe('When calling `nitric doctor`', () => {
			describe('When the user wants to install the software', () => {
				let installPulumiSpy: jest.SpyInstance;
				let installDockerSpy: jest.SpyInstance;

				// Run the command
				beforeAll(async () => {
					confirmSpy.mockResolvedValue(true); // Yes, install it
					installPulumiSpy = jest.spyOn(InstallPulumi.prototype, 'run').mockResolvedValue();
					installDockerSpy = jest.spyOn(InstallDocker.prototype, 'run').mockResolvedValue();

					await new Doctor([], null as any).run();
				});

				afterAll(() => {
					whichSpy.mockReset();
					tableSpy.mockReset();
					infoSpy.mockReset();
					confirmSpy.mockReset();

					installPulumiSpy.mockRestore();
					installDockerSpy.mockRestore();
				});

				it('Should check the software is installed', () => {
					expect(whichSpy).toBeCalledTimes(2); // Pululi, Docker
				});

				it('Should list the software', () => {
					expect(tableSpy).toBeCalled();
				});

				it('Should ask to install the software', () => {
					expect(confirmSpy).toBeCalledTimes(1);

					expect(confirmSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('install missing software?'));
				});
			});

			describe("When the user doesn't want to install the software", () => {
				// Run the command
				beforeAll(async () => {
					confirmSpy.mockResolvedValue(false); // Don't, install it
					await new Doctor([], null as any).run();
				});

				afterAll(() => {
					whichSpy.mockReset();
					tableSpy.mockReset();
					infoSpy.mockReset();
					confirmSpy.mockReset();
				});

				it('Should check the software is installed', () => {
					expect(whichSpy).toBeCalledTimes(2); // Pululi, Docker
				});

				it('Should list the software', () => {
					expect(tableSpy).toBeCalled();
				});

				it('Should ask to install the software', () => {
					expect(confirmSpy).toBeCalledWith(expect.stringContaining('install missing software?'));
				});
			});
		});
	});
});

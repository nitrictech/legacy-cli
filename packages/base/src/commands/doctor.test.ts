import 'jest';
import Doctor from './doctor';
import which from 'which';
import cli from 'cli-ux';
import { InstallPulumi, InstallDocker } from '../tasks/doctor';

describe('Doctor Command:', () => {
	let tableSpy: jest.SpyInstance;
	let infoSpy: jest.SpyInstance;

	beforeAll(() => {
		jest.mock('cli-ux');
		jest.mock('which');
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
			whichSpy = jest.spyOn(which, 'sync').mockReturnValue(true); // Installed.
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
				expect(whichSpy).toBeCalledTimes(2); // Pululi, Docker
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
		let confirmSpy: jest.SpyInstance;

		beforeAll(() => {
			whichSpy = jest.spyOn(which, 'sync').mockReturnValue(false); // Not installed.
			confirmSpy = jest.spyOn(cli, 'confirm');
		});

		afterAll(() => {
			whichSpy.mockReset();
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
					expect(confirmSpy).toBeCalledWith(
						expect.stringContaining('Would you like nitric to try installing missing software?'),
					);
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
					expect(confirmSpy).toBeCalledWith(
						expect.stringContaining('Would you like nitric to try installing missing software?'),
					);
				});
			});
		});
	});
});

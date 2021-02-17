import 'jest';
import { Task } from '@nitric/cli-common';
import { InstallDocker } from './install-docker';
import execa from 'execa';

describe('Task Doctor Install Docker', () => {
	let emitSpy: jest.SpyInstance;
	let commandSpy: jest.SpyInstance;

	beforeAll(() => {
		jest.mock('execa');
		emitSpy = jest.spyOn(Task.prototype, 'emit').mockReturnValue(true);
		commandSpy = jest.spyOn(execa, 'command').mockResolvedValue(null as any);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	describe('When executing the install Docker task', () => {
		beforeAll(async () => {
			await new InstallDocker({
				stdin: null as any,
				stdout: null as any,
			}).do();
		});

		it('Should call the install command', () => {
			expect(commandSpy).toBeCalled();
		});

		it('Should notify of updates', () => {
			expect(emitSpy).toBeCalledWith('update', 'Installing docker from https://get.docker.com');
		});

		describe('When the install command fails', () => {
			beforeAll(() => {
				emitSpy.mockImplementationOnce(() => {
					throw new Error('mock error');
				});
			});

			it('Should throw an error', async () => {
				expect(
					new InstallDocker({
						stdin: null as any,
						stdout: null as any,
					}).do(),
				).rejects.toEqual(new Error('Failed to install docker: Error: mock error'));
			});
		});
	});
});

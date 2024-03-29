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
import { Task } from '@nitric/cli-common';
import { InstallPulumi } from './install-pulumi';
import execa from 'execa';

describe('Task Doctor Install Pulumi', () => {
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

	describe('When executing the install Pulumi task', () => {
		beforeAll(async () => {
			await new InstallPulumi({
				stdin: null as any,
				stdout: null as any,
			}).do();
		});

		it('Should call the install command', () => {
			expect(commandSpy).toBeCalled();
		});

		it('Should notify of updates', () => {
			expect(emitSpy).toBeCalledWith('update', 'Installing pulumi from https://get.pulumi.com');
		});

		describe('When the install command fails', () => {
			beforeAll(() => {
				emitSpy.mockImplementationOnce(() => {
					throw new Error('mock error');
				});
			});

			it('Should throw an error', async () => {
				expect(
					new InstallPulumi({
						stdin: null as any,
						stdout: null as any,
					}).do(),
				).rejects.toEqual(new Error('Failed to install pulumi: Error: mock error'));
			});
		});
	});
});

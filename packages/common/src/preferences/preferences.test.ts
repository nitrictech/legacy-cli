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
import { Preferences } from './preferences';
import { block } from '../utils';
import inquirer from 'inquirer';

describe('initWorkflow', () => {
	let consoleLogSpy: jest.SpyInstance;
	let requiresInitSpy: jest.SpyInstance;
	let preferencesInitSpy: jest.SpyInstance;
	let promptSpy: jest.SpyInstance;

	beforeAll(() => {
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {
			// NO_OP
		});

		preferencesInitSpy = jest.spyOn(Preferences, 'init').mockResolvedValue(
			new Preferences({
				clientId: 'testing',
				analyticsEnabled: true,
			})
		);

		promptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
			analyticsOptIn: true,
		});
	});

	afterAll(() => {
		consoleLogSpy.mockRestore();
		promptSpy.mockRestore();
		preferencesInitSpy.mockRestore();
	});

	describe('when preferences require initialization', () => {
		beforeAll(async () => {
			requiresInitSpy = jest.spyOn(Preferences, 'requiresInit').mockReturnValueOnce(true);
			await Preferences.initWorkflow();
		});
	
		afterAll(() => {
			requiresInitSpy.mockClear();
			consoleLogSpy.mockClear();
			preferencesInitSpy.mockClear();
			promptSpy.mockClear();
		});

		it('should check if preferences require init', () => {
			expect(requiresInitSpy).toBeCalled();
		});

		it('should print an analytics opt in prompt for the user', () => {
			expect(consoleLogSpy).toBeCalledTimes(1);
			expect(consoleLogSpy).toBeCalledWith(block`
			At Nitric we're striving to provide the best possible developer experience for all of our tools.
			To help us do this we'd like to collect anonymous analytics to help us track plugins & features used, issues and performance metrics.

			Note: this doesn't include any personal data, source code or other sensitive information about your projects.
		`);
		});

		it('should prompt the user to opt-in to analytics', () => {
			expect(promptSpy).toBeCalled();
			expect(promptSpy).toBeCalledWith([
				{
					name: 'analyticsOptIn',
					message: 'Enable Anonymous Analytics',
					type: 'confirm',
				},
			]);
		});

		it('should init the users preferences with their analytics opt in status', () => {
			expect(preferencesInitSpy).toBeCalled();
			expect(preferencesInitSpy).toBeCalledWith({
				analyticsOptIn: true
			});
		});

	});

	describe('when preferences are already initialialized', () => {
		beforeAll(async () => {
			requiresInitSpy = jest.spyOn(Preferences, 'requiresInit').mockReturnValueOnce(false);
			await Preferences.initWorkflow();
		});

		it('should check if preferences require initialization', () => {
			expect(requiresInitSpy).toBeCalledTimes(1);
		});

		it('should not log output to the user', () => {
			expect(consoleLogSpy).not.toBeCalled();
		});

		it('should not prompt the user to opt in to analytics', () => {
			expect(promptSpy).not.toBeCalled();
		});

		it('should not initialize preferences', () => {
			expect(preferencesInitSpy).not.toBeCalled();
		});
	});
});
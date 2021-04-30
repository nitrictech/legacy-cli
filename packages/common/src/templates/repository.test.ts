// Copyright 2021, Nitric Pty Ltd.
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
import { Repository } from './repository';

describe('Repository', () => {
	describe('Given a repository with no templates', () => {
		const testRepo = new Repository('testrepo', '/repos/testrepo', []);

		describe('When calling getName', () => {
			it('Should return the repository name', () => {
				expect(testRepo.getName()).toEqual('testrepo');
			});
		});

		describe('When calling getTemplates', () => {
			it('Should return an empty array', () => {
				expect(testRepo.getTemplates()).toEqual([]);
			});
		});

		describe('When calling hasTemplate', () => {
			it('Should return false', () => {
				expect(testRepo.hasTemplate('any-name')).toEqual(false);
			});
		});

		describe('When calling getTemplate', () => {
			it('Should fail', () => {
				expect(() => testRepo.getTemplate('any-name')).toThrow(
					'Template any-name does not exist in repository testrepo',
				);
			});
		});
	});

	describe('Given a repository with templates', () => {
		const testRepo = new Repository('testrepo', '/repos/testrepo', [
			{
				name: 'testtemplate',
				path: '/templates/testtemplate',
				lang: 'mocklang',
			},
		]);

		describe('When calling getTemplates', () => {
			it('Should return the templates', () => {
				expect(testRepo.getTemplates()).toEqual([
					{
						name: 'testtemplate',
						// The path should now include the repository path as a prefix
						path: '/repos/testrepo/templates/testtemplate',
						lang: 'mocklang',
					},
				]);
			});
		});

		describe('When calling hasTemplate with a matching name', () => {
			it('Should return true', () => {
				expect(testRepo.hasTemplate('testtemplate')).toEqual(true);
			});
		});

		describe('When calling hasTemplate with a non-matching name', () => {
			it('Should return false', () => {
				expect(testRepo.hasTemplate('nomatch')).toEqual(false);
			});
		});

		describe('When calling getTemplate with a matching name', () => {
			it('Should return the template', () => {
				expect(testRepo.getTemplate('testtemplate')).toEqual({
					name: 'testtemplate',
					// The path should now include the repository path as a prefix
					path: '/repos/testrepo/templates/testtemplate',
					lang: 'mocklang',
				});
			});
		});

		describe('When calling getTemplate with a non-matching name', () => {
			it('Should fail', () => {
				expect(() => testRepo.getTemplate('nomatch')).toThrow('Template nomatch does not exist in repository testrepo');
			});
		});
	});
});

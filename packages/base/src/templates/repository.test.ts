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
				expect(() => testRepo.getTemplate('any-name')).toThrow('Template any-name does not exist in repository testrepo');
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

import { sanitizeStringForDockerTag } from '../src/utils';

describe('Function utilities', () => {
	describe('When sanitizing string for use with docker', () => {
		describe(`Given the string 'My Function'`, () => {
			test(`The result should be myfunction`, () => {
				expect(sanitizeStringForDockerTag('My Function')).toBe('myfunction');
			});
		});
	});
});

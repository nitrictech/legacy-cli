import { block } from '../src/utils';

describe('Tagged template utilities', () => {
	describe('When using the block tagged template', () => {
		test(`The result should be be surrounded by new lines`, () => {
			expect(block`My testing sentence`).toBe('\nMy testing sentence\n');
		});
	});

	describe('When using the block tagged template with keys', () => {
		test(`The result should be be surrounded by new lines`, () => {
			const name = 'John';
			const lastName = 'Doe';
			expect(block`My testing sentence by ${name} ${lastName}`).toBe('\nMy testing sentence by John Doe\n');
		});
	});
});

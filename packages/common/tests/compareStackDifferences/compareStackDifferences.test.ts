import { compareStackDifferences } from '../../src/utils/stack';
import { Stack } from '../../src/stack';
import { NitricStack, NitricService } from '../../src/types';
import fs from 'fs';

const services = {
	path: 'test',
	runtime: 'official/nextjs',
} as NitricService;

const descriptor = {
	name: 'test',
	services: {
		test: services,
	},
} as NitricStack;

describe('When comparing a YAML file with a Stack', () => {
	describe('Where the file has a top level comment', () => {
		test(`The result should also have the same comment`, () => {
			const source = '/Users/ryan/Documents/Code/Code/packages/common/tests/compareStackDifferences/test-1.yml';
			const test1 = new Stack(source, descriptor);
			const stackDifference = compareStackDifferences(test1, source);
			expect(stackDifference).toBe(fs.readFileSync(source, 'utf8').toString());
		});
	});
});
describe('When comparing a YAML file with a Stack', () => {
	describe('Where the file has a new line comment', () => {
		test(`The result should also have the same comment`, () => {
			const source = '/Users/ryan/Documents/Code/Code/packages/common/tests/compareStackDifferences/test-2.yml';
			const test2 = new Stack(source, descriptor);
			const stackDifference = compareStackDifferences(test2, source);
			expect(stackDifference).toBe(fs.readFileSync(source, 'utf8').toString());
		});
	});
});
describe('When comparing a YAML file with a Stack', () => {
	describe('Where the file has an inline comment', () => {
		test(`The result should also have the same comment`, () => {
			const source = '/Users/ryan/Documents/Code/Code/packages/common/tests/compareStackDifferences/test-3.yml';
			const test3 = new Stack(source, descriptor);
			const stackDifference = compareStackDifferences(test3, source);
			expect(stackDifference).toBe(fs.readFileSync(source, 'utf8').toString());
		});
	});
});
describe('When comparing a YAML file with a Stack', () => {
	describe('Where the file has an inline comment', () => {
		test(`The result should also have the same comment`, () => {
			const source = '/Users/ryan/Documents/Code/Code/packages/common/tests/compareStackDifferences/test-4.yml';
			const test4 = new Stack(source, descriptor);
			const stackDifference = compareStackDifferences(test4, source);
			expect(stackDifference).toBe(fs.readFileSync(source, 'utf8').toString());
		});
	});
});

import { ListTemplatesTask } from '../../tasks/template/list';
import { cli } from 'cli-ux';
import { Tree } from 'cli-ux/lib/styled/tree';
import List from './list';

describe('nitric templates:list', () => {
	let treeCreateSpy: jest.SpyInstance;
	let treeDisplaySpy: jest.SpyInstance;
	let logMsgSpy: jest.SpyInstance;
	let trees: Tree[] = [];
	let loggedMessages: string[] = [];

	beforeEach(() => {
		trees = [];
		treeCreateSpy = jest.spyOn(cli, 'tree').mockImplementation(() => {
			const tmpTree = new Tree();
			trees.push(tmpTree);
			return tmpTree;
		});
		loggedMessages = [];
		logMsgSpy = jest.spyOn(cli, 'log').mockImplementation((msg: string | undefined) => {
			loggedMessages.push(msg!);
		});
		treeDisplaySpy = jest.spyOn(Tree.prototype, 'display').mockImplementation(() => {});
	});

	afterEach(() => {
		logMsgSpy.mockRestore();
		treeCreateSpy.mockRestore();
		treeDisplaySpy.mockRestore();
	});

	describe('Given no repositories', () => {
		let listTemplatesTaskSpy: jest.SpyInstance;

		beforeAll(() => {
			listTemplatesTaskSpy = jest.spyOn(ListTemplatesTask.prototype, 'do').mockReturnValue(
				Promise.resolve({}),
			);
		});

		afterAll(() => {
			listTemplatesTaskSpy.mockRestore();
		});

		// Mock the ListRepositoryTask
		it('Should print a message suggesting a run of repos add', async () => {
			await List.run([]);
			expect(loggedMessages).toContain('No templates found, try installing some repositories using nitric templates:repos add');
		});
	});

	describe('Given a single repository', () => {
		let listTemplatesTaskSpy: jest.SpyInstance;

		beforeAll(() => {
			listTemplatesTaskSpy = jest.spyOn(ListTemplatesTask.prototype, 'do').mockReturnValue(
				Promise.resolve({
					official: ['typescript', 'python'],
				}),
			);
		});

		afterAll(() => {
			listTemplatesTaskSpy.mockRestore();
		});
		// Mock the ListRepositoryTask

		it('Should print a cli-ux tree containing templates to stdout', async () => {
			await List.run([]);
			const [rootTree] = trees;
			expect(trees.length).toBeGreaterThan(0);
			expect(rootTree.nodes['official']).toEqual(expect.anything());
			expect(rootTree.nodes['official'].nodes['typescript']).toEqual(expect.anything());
			expect(rootTree.nodes['official'].nodes['python']).toEqual(expect.anything());
		});
	});

	describe('Given multiple repositories', () => {
		let listTemplatesTaskSpy: jest.SpyInstance;

		beforeAll(() => {
			listTemplatesTaskSpy = jest.spyOn(ListTemplatesTask.prototype, 'do').mockReturnValue(
				Promise.resolve({
					official: ['typescript', 'python'],
					semiofficial: ['shakespeare', 'piet'],
				}),
			);
		});

		afterAll(() => {
			listTemplatesTaskSpy.mockRestore();
		});
		// Mock the ListRepositoryTask

		it('Should print a cli-ux tree containing templates to stdout', async () => {
			await List.run([]);
			const [rootTree] = trees;
			expect(trees.length).toBeGreaterThan(0);
			expect(rootTree.nodes['official']).toEqual(expect.anything());
			expect(rootTree.nodes['official'].nodes['typescript']).toEqual(expect.anything());
			expect(rootTree.nodes['official'].nodes['python']).toEqual(expect.anything());

			expect(rootTree.nodes['semiofficial']).toEqual(expect.anything());
			expect(rootTree.nodes['semiofficial'].nodes['shakespeare']).toEqual(expect.anything());
			expect(rootTree.nodes['semiofficial'].nodes['piet']).toEqual(expect.anything());
		});
	});
});

import { ListTemplatesTask } from "../../tasks/template/list";
import { cli } from "cli-ux";
import { Tree } from "cli-ux/lib/styled/tree";
import List from "./list";

describe("nitric templates:list", () => {
  let treeCreateSpy: jest.SpyInstance;
  let treeDisplaySpy: jest.SpyInstance;
  let trees: Tree[] = [];

  beforeEach(() => {
    trees = [];
    treeCreateSpy = jest.spyOn(cli, 'tree').mockImplementation(() => {
      const tmpTree = new Tree();
      trees.push(tmpTree);
      return tmpTree;
    });
    treeDisplaySpy = jest.spyOn(Tree.prototype, 'display').mockImplementation(() => {});
  });

  afterEach(() => {
    treeCreateSpy.mockRestore();
    treeDisplaySpy.mockRestore();
  });

  describe("Given a single repository", () => {
    let listTemplatesTaskSpy: jest.SpyInstance;

    beforeAll(() => {
      listTemplatesTaskSpy = jest.spyOn(ListTemplatesTask.prototype, 'do').mockReturnValue(Promise.resolve({
        official: ["typescript", "python"]
      }));
    });

    afterAll(() => {
      listTemplatesTaskSpy.mockRestore();
    });
    // Mock the ListRepositoryTask

    it("Should print a cli-ux tree containing templates to stdout", async () => {
      await List.run([]);
      const [rootTree] = trees;
      expect(trees.length).toBeGreaterThan(0);
      expect(rootTree.nodes['official']).toEqual(expect.anything())
      expect(rootTree.nodes['official'].nodes['typescript']).toEqual(expect.anything());
      expect(rootTree.nodes['official'].nodes['python']).toEqual(expect.anything());
    });
  });

  describe("Given multiple repositories", () => {
    let listTemplatesTaskSpy: jest.SpyInstance;

    beforeAll(() => {
      listTemplatesTaskSpy = jest.spyOn(ListTemplatesTask.prototype, 'do').mockReturnValue(Promise.resolve({
        official: ["typescript", "python"],
        semiofficial: ["shakespeare", "piet"]
      }));
    });

    afterAll(() => {
      listTemplatesTaskSpy.mockRestore();
    });
    // Mock the ListRepositoryTask

    it("Should print a cli-ux tree containing templates to stdout", async () => {
      await List.run([]);
      const [rootTree] = trees;
      expect(trees.length).toBeGreaterThan(0);
      expect(rootTree.nodes['official']).toEqual(expect.anything())
      expect(rootTree.nodes['official'].nodes['typescript']).toEqual(expect.anything());
      expect(rootTree.nodes['official'].nodes['python']).toEqual(expect.anything());

      expect(rootTree.nodes['semiofficial']).toEqual(expect.anything())
      expect(rootTree.nodes['semiofficial'].nodes['shakespeare']).toEqual(expect.anything());
      expect(rootTree.nodes['semiofficial'].nodes['piet']).toEqual(expect.anything());
    });
  });
});
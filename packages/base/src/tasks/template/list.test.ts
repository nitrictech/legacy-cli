import { ListTemplatesTask } from "./list"
import fs from "fs";
import * as utils from "../../utils";

jest.mock('fs');
jest.mock('../../utils');

afterAll(() => {
  jest.restoreAllMocks();
})

describe("ListTemplatesTask", () => {
  describe("Given the templates directory does not exist", () => {
    let readDirSyncSpy: jest.SpyInstance;
    beforeAll(() => {
      readDirSyncSpy = jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error("ENOENT: Directory does not exist")
      });
    });

    afterAll(() => {
      readDirSyncSpy.mockRestore();
    });

    it("Should throw an error", async () => {
      // FIXME: Fix this test...
      await expect(new ListTemplatesTask().do())
        .rejects
        .toThrow("Could not find templates directory");
    });
  });

  describe("Given there is a template repository", () => {
    let readDirSyncSpy: jest.SpyInstance;
    let loadRepositoryManifestSpy: jest.SpyInstance;
    beforeAll(() => {
      readDirSyncSpy = jest.spyOn(fs, 'readdirSync').mockReturnValue([
        {
          name: 'dummyrepo',
          isDirectory: () => true,
        } as any,
      ]);

      loadRepositoryManifestSpy = jest.spyOn(utils, 'loadRepositoryManifest').mockReturnValueOnce({
        name: "dummyrepo",
        templates: [{
          name: "test",
          path: "/templates/dummyrepo",
          codeDir: "/function",
          lang: "dummy",
        }]
      });
    });

    afterAll(() => {
      loadRepositoryManifestSpy.mockRestore();
      readDirSyncSpy.mockRestore();
    });

    it("Should return a single repository with it's templates", async () => {
      await expect(new ListTemplatesTask().do())
        .resolves
        .toEqual({
          "dummyrepo": [
            "test",
          ],
        });
    });
  });
});
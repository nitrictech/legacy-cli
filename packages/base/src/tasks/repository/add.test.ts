
import { NitricRepositories } from "../../common/types";
import * as utils from "../../utils";
import * as git from "simple-git";
import { AddRepositoryTask } from "./add";
// Mock out external dependencies
jest.mock('../../utils');
jest.mock('fs');
jest.mock('rimraf');

describe("AddRepositoryTask", () => {
  describe("Given the nitric template store contains an 'official' repository", () => {
    let loadRepositoriesManifestSpy: jest.SpyInstance;
    beforeAll(() => {
      // Mock the nitric repository stored here...
      loadRepositoriesManifestSpy = jest.spyOn(utils, 'loadRepositoriesManifest')
      .mockReturnValue({
        official: {
          location: "https://mock.nitric.io/official"
        },
      } as NitricRepositories);
    });

    afterAll(() => {
      loadRepositoriesManifestSpy.mockRestore();
    });

    describe("When adding a custom repository with the alias 'official'", () => {
      it("Should throw an error", async () => {
        await expect(new AddRepositoryTask({
          alias: "official",
          url: "http://my-fake-repo"
        }).do()).rejects.toThrowError('Alias exists as a reserved name in the nitric store, please use a different name');
      });
    });

    describe("When adding a custom repository under a custom alias", () => {
      let gitCloneMock: jest.SpyInstance;
      beforeAll(() => {
        gitCloneMock = jest.spyOn(git, 'gitP').mockReturnValue({
          clone: jest.fn()
        } as any)
      });

      afterAll(() => {
        gitCloneMock.mockRestore();
      });

      it("Should successfully add the repository", async () => {
        await expect(new AddRepositoryTask({
          alias: "my-repo",
          url: "http://my-fake-repo"
        }).do()).resolves.toBe(undefined);
      });
    });

    describe("When adding a custom repository that errors on clone", () => {
      let gitCloneMock: jest.SpyInstance;
      beforeAll(() => {
        gitCloneMock = jest.spyOn(git, 'gitP').mockReturnValue({
          clone: async () => {
            throw new Error("Unable to check out repository");
          }
        } as any)
      });

      afterAll(() => {
        gitCloneMock.mockRestore();
      });

      it("Should throw the error provided by gitP.clone", async () => {
        await expect(new AddRepositoryTask({
          alias: "my-repo",
          url: "http://my-fake-repo"
        }).do()).rejects.toThrowError("Unable to check out repository");
      });
    });

    describe("When adding a supported repository for an alias that does not exist", () => {
      it("Should throw an error", async () => {
        await expect(new AddRepositoryTask({
          alias: "official2",
        }).do()).rejects.toThrowError("No registered repository exists with name: official2");
      });
    });
  });
});
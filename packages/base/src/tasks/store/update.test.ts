
import { UpdateStoreTask } from "./update";
import * as git from "simple-git";
import fs from "fs";
import rimraf from "rimraf";

jest.mock('fs');
jest.mock('rimraf');

afterAll(() => {
  jest.restoreAllMocks();
});

describe("UpdateStoreTask", () => {

  describe("And the store directory already exists", () => {
    let gitCloneSpy: jest.SpyInstance;
    let fsExistSpy: jest.SpyInstance;
    let rimRafSpy: jest.SpyInstance;
    const mockGit = {
      clone: jest.fn(),
    } as any;
    beforeAll(() => {
      gitCloneSpy = jest.spyOn(git, 'gitP').mockReturnValue(mockGit);
      fsExistSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
      rimRafSpy = jest.spyOn(rimraf, 'sync');
    });

    afterAll(() => {
      gitCloneSpy.mockRestore();
      fsExistSpy.mockRestore();
    });

    it("Should remove the existing directory", async () => {
      await expect(new UpdateStoreTask().do()).resolves.toBe(undefined);
      expect(rimRafSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Given git.clone succeeds", () => {
    let gitCloneSpy: jest.SpyInstance;
    const mockGit = {
      clone: jest.fn(),
    } as any;
    beforeAll(() => {
      gitCloneSpy = jest.spyOn(git, 'gitP').mockReturnValue(mockGit);
    });

    afterAll(() => {
      gitCloneSpy.mockRestore();
    });

    it("Should successfully clone the nitric store", async () => {
      await expect(new UpdateStoreTask().do()).resolves.toBe(undefined);
      expect(mockGit.clone).toHaveBeenCalledTimes(1);
    });
  });

  describe("Given git.clone fails", () => {
    let gitCloneSpy: jest.SpyInstance;
    const mockGit = {
      clone: async () => { throw new Error("Unable to checkout repository") },
    } as any;
    beforeAll(() => {
      gitCloneSpy = jest.spyOn(git, 'gitP').mockReturnValue(mockGit);
    });

    afterAll(() => {
      gitCloneSpy.mockRestore();
    });

    it("Should throw the error returned by git.clone", async () => {
      await expect(new UpdateStoreTask().do()).rejects.toThrowError("Unable to checkout repository");
    });
  });
});
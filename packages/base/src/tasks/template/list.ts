import { Task } from '@nitric/cli-common';
import fs from 'fs';
import { TEMPLATE_DIR } from '../../common/paths';

interface ListTemplatesResult {
  [repositoryName: string]: string[]
}

/**
 * List locally available templates and the repositories they belong to
 */
export class ListTemplatesTask extends Task<ListTemplatesResult> {
  constructor() {
    super("List Templates");
  }

  async do(): Promise<ListTemplatesResult> {

    // First find the nitric home directory
    try {
      const repoDirectories = fs
        .readdirSync(TEMPLATE_DIR, {
          withFileTypes: true,
        })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      return repoDirectories.reduce((acc, repo) => {
        const innerDir = `${TEMPLATE_DIR}/${repo}`;

        return {
          ...acc,
          [repo]: fs
            .readdirSync(innerDir, {
              withFileTypes: true,
            })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
        }
      }, {} as ListTemplatesResult);
    } catch (error) {
      throw new Error("Could not find templates directory");
    }
  }

}
import { Task } from '@nitric/cli-common';
import fs from 'fs';
import { NITRIC_STORE_DIR } from '../../common/paths';

import { gitP } from "simple-git"
import rimraf from 'rimraf';

// The nitric template store location
const NITRIC_TEMPLATE_STORE = "https://github.com/nitric-dev/template-store";

/**
 * Pulls the latest official nitric store manifests
 */
export class UpdateStoreTask extends Task<void> {
  constructor() {
    super("Updating Nitric Store");
  }

  async do(): Promise<void> {
    const git = gitP(NITRIC_STORE_DIR);

    // Do a fresh checkout every time
    if (fs.existsSync(NITRIC_STORE_DIR)) {
      rimraf.sync(NITRIC_STORE_DIR)
    }

    fs.mkdirSync(NITRIC_STORE_DIR);

    try {
      await git.clone(NITRIC_TEMPLATE_STORE, '.', {
        '--depth': 1
      });
    } catch (error) {
      throw error;
    }
  }
}
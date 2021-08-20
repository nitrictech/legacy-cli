// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as os from 'os';
import * as path from 'path';

export const USER_HOME = os.homedir();
export const NITRIC_HOME = process.env.NITRIC_HOME || path.join(USER_HOME, '.nitric');
export const TMP_DIR = path.join(NITRIC_HOME, 'tmp');
export const STAGING_DIR = path.join(NITRIC_HOME, 'staging');
export const STAGING_API_DIR = path.join(STAGING_DIR, 'apis');
export const TEMPLATE_DIR = path.join(NITRIC_HOME, 'templates');
export const LOG_DIR = path.join(NITRIC_HOME, 'logs');
export const PREFERENCES_FILE = path.join(NITRIC_HOME, 'preferences.yaml');

// Location of the nitric template store manifests
export const NITRIC_STORE_DIR = path.join(NITRIC_HOME, 'store');
export const NITRIC_REPOSITORIES_FILE = path.join(NITRIC_STORE_DIR, 'repositories.yaml');
export const NITRIC_TEMPLATE_DIR = path.join(TEMPLATE_DIR, 'official');

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

import fs from 'fs';
import { OpenAPIV3 } from 'openapi-types';
import { NitricAPI } from '../types';
import { Stack } from './stack';
import YAML from 'yaml';
import path from 'path';

// Inject referencable NitricStack metadata into the OpenAPI typing
// This will extend at the point of an operations object...
// Using this we can find the appropriate backend reference
// in each of the cloud plugins during deployment
export interface NitricAPITarget {
	'x-nitric-target': {
		name: string;
		type: 'function' | 'container';
	};
}

type omitMethods = 'getApi' | 'getApis';

export type StackAPIDocument = OpenAPIV3.Document<NitricAPITarget>;

export class StackAPI {
	public readonly stack: Omit<Stack, omitMethods>;
	public readonly name: string;
	public readonly descriptor: string;
	private _document?: StackAPIDocument;

	constructor(stack: Stack, name: string, descriptor: NitricAPI) {
		this.stack = stack;
		this.name = name;
		this.descriptor = descriptor;
	}

	public get path(): string {
		return path.join(this.stack.getDirectory(), this.descriptor);
	}

	public get document(): StackAPIDocument {
		if (!this._document) {
			// Read the api file and cache it locally
			// parse the file contents
			this._document = YAML.parse(fs.readFileSync(this.path).toString()) as StackAPIDocument;
		}

		return this._document;
	}
}

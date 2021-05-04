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

import { OpenAPIV3 } from 'openapi-types';

// Inject referencable NitricStack metadata into the OpenAPI typing
// This will extend at the point of an operations object...
// Using this we can find the appropriate backend reference
// in each of the cloud plugins during deployment
export interface NitricAPITarget {
	'x-nitric-target': {
		name: string;
		type: 'function';
	};
}

export interface NitricAPI<Ext extends Record<string, any> = {}> extends OpenAPIV3.Document<NitricAPITarget> {
	// The name of the API...
	ext?: Ext;
}

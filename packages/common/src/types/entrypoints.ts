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

export interface NitricEntrypointPath<Ext extends Record<string, any> = {}> {
	target: string;
	type: 'site' | 'api' | 'service';
	ext?: Ext;
}

interface NitricDomain<Ext extends Record<string, any> = {}> {
  ext?: Ext; 
}

export interface NitricEntrypoint<
	PathExtensions = Record<string, any>,
	DomainExtensions = Record<string, any>,
> {
	domains?: {
		[key: string]: NitricDomain<DomainExtensions>;
	};
	paths: {
		[key: string]: NitricEntrypointPath<PathExtensions>;
	};
}

export interface NitricEntrypoints<
	PathExtensions = Record<string, any>,
	DomainExtensions = Record<string, any>,
> {
	[key: string]: NitricEntrypoint<PathExtensions, DomainExtensions>;
}

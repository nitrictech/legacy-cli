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

import { NitricComputeUnit } from '@nitric/cli-common';
import { web } from '@pulumi/azure-native';
import { Image } from '@pulumi/docker';

export interface DeployedComputeImage extends NitricComputeUnit {
	name: string;
	image: Image;
}

export interface DeployedComputeUnit extends NitricComputeUnit {
	name: string;
	appService: web.WebApp;
}
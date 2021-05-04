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

import { NitricTopic } from '@nitric/cli-common';
import { pubsub } from '@pulumi/gcp';
import { DeployedTopic } from '../types';

/**
 * Create a new pubsub topic
 */
export function createTopic(topic: NitricTopic): DeployedTopic {
	const pubsubTopic = new pubsub.Topic(topic.name, {
		name: topic.name,
	});

	return {
		...topic,
		pubsub: pubsubTopic,
	};
}

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
import execa from 'execa';

export function checkDockerDaemon(doctorCommand = 'doctor'): void {
	try {
		execa.sync('docker', ['ps']);
	} catch {
		throw new Error(
			`Docker daemon was not found!\nTry using 'nitric ${doctorCommand}' to confirm it is correctly installed, and check that the service is running.`,
		);
	}
}

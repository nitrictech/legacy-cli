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

import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';

interface NitricGcpProjectArgs {
	project: gcp.organizations.GetProjectResult;
	disableDependentServices?: boolean;
	disableOnDestroy?: boolean;
}

// This is a list of service APIs required by nitric to operate
// with the default set of services used by the GCP provider
const ENABLE_SERVICE_APIS = [
	// Enable IAM
	'iam.googleapis.com',
	// Enable cloud run
	'run.googleapis.com',
	// Enable pubsub
	'pubsub.googleapis.com',
	// Enable cloud scheduler
	'cloudscheduler.googleapis.com',
	// Enable cloud scheduler
	'storage.googleapis.com',
	// Enable Compute API (Networking/Load Balancing)
	'compute.googleapis.com',
	// Enable Container Registry API
	'containerregistry.googleapis.com',
	// Enable firestore API
	'firestore.googleapis.com',
	// Enable ApiGateway API
	'apigateway.googleapis.com',
];

/**
 * Nitric GCP Project for preparing a GCP project for Nitric stacks
 */
export class NitricGcpProject extends pulumi.ComponentResource {
	public readonly services: gcp.projects.Service[];

	constructor(name: string, args: NitricGcpProjectArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:project:GcpProject', name, {}, opts);
		const { project, disableDependentServices = true, disableOnDestroy = false } = args;

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

		// Create the services
		this.services = ENABLE_SERVICE_APIS.map(
			(api) =>
				new gcp.projects.Service(
					`${api}-enabled`,
					{
						project: project.id,
						service: api,
						disableOnDestroy,
						disableDependentServices,
					},
					defaultResourceOptions,
				),
		);

		// Add ServiceAccount Token Creator Role to the default pubsub gservice account
		// services-{projectNumber}@gcp-sa-pubsub.iam.gserviceaccount.com
		new gcp.projects.IAMMember(
			`pubsub-token-creator`,
			{
				role: 'roles/iam.serviceAccountTokenCreator',
				member: pulumi.interpolate`serviceAccount:services-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`,
				project: project.id,
			},
			{
				...defaultResourceOptions,
				// Only create this once the google managed service account is available
				dependsOn: this.services,
			},
		);

		this.registerOutputs({
			services: this.services,
		});
	}
}

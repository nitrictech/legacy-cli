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
import * as aws from '@pulumi/aws';
import { crawlDirectorySync, StackSite } from '@nitric/cli-common';
import path from 'path';
import mime from 'mime';

interface NitricSiteS3Args {
	site: StackSite;
	indexDocument: string;
	acl: 'public-read' | 'private';
}

/**
 * Nitric S3 Bucket based static site
 */
export class NitricSiteS3 extends pulumi.ComponentResource {
	/**
	 * The name of the s3 site
	 */
	public readonly name: string;
	/**
	 * The deployed bucket
	 */
	public readonly s3: aws.s3.Bucket;

	constructor(name, args: NitricSiteS3Args, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:site:S3', name, {}, opts);

		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { site, indexDocument, acl } = args;

		// Build the site before proceeding
		StackSite.buildSync(site);

		this.name = site.getName();

		// Create a Bucket for the static content to reside in
		this.s3 = new aws.s3.Bucket(
			site.getName(),
			{
				acl,
				website: {
					indexDocument,
				},
			},
			defaultResourceOptions,
		);

		crawlDirectorySync(path.resolve(site.getAssetPath()), (filePath: string) => {
			// Use path.relative to retrieve keyname for each file
			// This assumes that the asset folder is the root of the bucket
			const relativePath = path.relative(site.getAssetPath(), filePath);
			new aws.s3.BucketObject(
				relativePath,
				{
					acl: 'public-read',
					bucket: this.s3,
					contentType: mime.getType(filePath) || undefined,
					source: new pulumi.asset.FileAsset(filePath),
				},
				defaultResourceOptions,
			);
		});

		this.registerOutputs({
			name: this.name,
			s3: this.s3,
		});
	}
}

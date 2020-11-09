import { Command, flags } from '@oclif/command';
import { Deploy, PushImage, CreateTypeProviders, DeploySubscriptions } from '../../tasks/deploy';
import { wrapTaskForListr, readNitricDescriptor } from '@nitric/cli-common';
import Listr, { ListrTask } from 'listr';
import path from 'path';

// XXX: Commented out regions do not support cloud run
const SUPPORTED_REGIONS = [
	'us-west1',
	// 'us-west2',
	// 'us-west3',
	// 'us-west4',
	'us-central1',
	'us-east1',
	'us-east4',
	'northamerica-northeast1',
	// 'southamerica-east1',
	// 'europe-west2',
	'europe-west1',
	'europe-west4',
	// 'europe-west6'
	// 'europe-west3'
	'europe-north1',
	// 'asia-south1',
	'asia-southeast1',
	// 'asia-southeast2',
	// 'asia-east2',
	'asia-east1',
	'asia-northeast1',
	'asia-northeast2',
	// 'asia-northeast3',
	'asia-southeast1',
];

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Google Cloud Platform (GCP)';

	static examples = [`$ nitric deploy:gcp . -p my-gcp-project`];

	static flags = {
		project: flags.string({
			char: 'p',
			description: 'gcp project to deploy to',
			required: true,
		}),
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'gcp region to deploy to, defaults to us-central1',
		}),
		file: flags.string({ char: 'f' }),
		help: flags.help({ char: 'h' }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(DeployCmd);
		const { dir } = args;
		const { project, file = 'nitric.yaml', region = 'us-central1' } = flags;

		const stack = readNitricDescriptor(path.join(dir, file));

		new Listr([
			{
				title: 'Pushing Images',
				task: (): Listr =>
					new Listr(
						stack.functions!.map(
							(func): ListrTask =>
								wrapTaskForListr(
									new PushImage({
										gcpProject: project,
										stackName: stack.name,
										func,
										region,
									}),
								),
						),
						{ concurrent: true },
					),
			},
			wrapTaskForListr(
				new Deploy({
					gcpProject: project,
					stack,
					region,
				}),
			),
			// wrapTaskForListr(
			// 	new DeploySubscriptions({
			// 		gcpProject: project,
			// 		stack,
			// 		region,
			// 	}),
			// ),
		])
			.run()
			.then((results) => {
				console.log(results);
			})
			.catch((error) => {
				console.error(error);
			});
	}
}

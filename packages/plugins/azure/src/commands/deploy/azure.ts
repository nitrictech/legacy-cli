import { Command, flags } from '@oclif/command';
import Listr from 'listr';
import inquirer from 'inquirer';
import { Stack, StageStackTask, wrapTaskForListr } from '@nitric/cli-common';
import path from 'path';
import { Deploy } from '../../tasks/deploy';

// XXX: Commented out regions do not support cloud run
const SUPPORTED_REGIONS = [
	'eastus',
	'eastus2',
	'southcentralus',
	'westus2',
	'australiaeast',
	'southeastasia',
	'northeurope',
	'uksouth',
	'westeurope',
	'centralus',
	'northcentralus',
	'westus',
	'southafricanorth',
	'centralindia',
	'eastasia',
	'japaneast',
	'koreacentral',
	'canadacentral',
	'francecentral',
	'germanywestcentral',
	'norwayeast',
	'switzerlandnorth',
	'uaenorth',
	'brazilsouth',
	'centralusstage',
	'eastusstage',
	'eastus2stage',
	'northcentralusstage',
	'southcentralusstage',
	'westusstage',
	'westus2stage',
	'asia',
	'asiapacific',
	'australia',
	'brazil',
	'canada',
	'europe',
	'global',
	'india',
	'japan',
	'uk',
	'unitedstates',
	'eastasiastage',
	'southeastasiastage',
	'centraluseuap',
	'eastus2euap',
	'westcentralus',
	'westus3',
	'southafricawest',
	'australiacentral',
	'australiacentral2',
	'australiasoutheast',
	'japanwest',
	'koreasouth',
	'southindia',
	'westindia',
	'canadaeast',
	'francesouth',
	'germanynorth',
	'norwaywest',
	'switzerlandwest',
	'ukwest',
	'uaecentral',
	'brazilsoutheast',
];

export default class DeployCmd extends Command {
	static description = 'Deploy a Nitric application to Microsoft Azure';

	static examples = [`$ nitric deploy:gcp`];

	static flags = {
		region: flags.enum({
			options: SUPPORTED_REGIONS,
			char: 'r',
			description: 'azure region to deploy to',
		}),
		guided: flags.boolean({ default: false }),
		file: flags.string({
			char: 'f',
			default: 'nitric.yaml',
		}),
		orgName: flags.string({}),
		adminEmail: flags.string({}),
		help: flags.help({ char: 'h', default: false }),
	};

	static args = [{ name: 'dir' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(DeployCmd);
		const { guided, orgName, adminEmail } = flags;
		const { dir = '.' } = args;

		const prompts = Object.keys(DeployCmd.flags)
			.filter((key) => flags[key] === undefined || flags[key] === null)
			.map((key) => {
				const flag = DeployCmd.flags[key];
				const prompt = {
					name: key,
					message: flag.description,
					type: 'string',
				};
				if (flag.options) {
					prompt.type = 'list';
					prompt['choices'] = flag.options;
				}
				return prompt;
			});

		let promptFlags = {};
		if (guided) {
			promptFlags = await inquirer.prompt(prompts);
		}

		const { file, region } = { ...flags, ...promptFlags };

		if (!region) {
			throw new Error('Region must be provided, for prompts use the --guided flag');
		}

		if (!orgName) {
			throw new Error('orgName must be provided, for prompts use the --guided flag');
		}

		if (!adminEmail) {
			throw new Error('adminEmail must be provided, for prompts use the --guided flag');
		}

		const stack = await Stack.fromFile(path.join(dir, file));

		new Listr([wrapTaskForListr(new StageStackTask({ stack })), wrapTaskForListr(new Deploy({ stack, region, orgName, adminEmail }))]).run();
	}
}

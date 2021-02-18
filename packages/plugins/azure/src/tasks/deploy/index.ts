import { NitricStack, Task } from "@nitric/cli-common";
import { LocalWorkspace } from "@pulumi/pulumi/x/automation"
import { core, storage, appservice } from "@pulumi/azure";
import { createBucket } from "./bucket";
import { createTopic } from "./topic";

interface DeployOptions {
	stack: NitricStack;
	region: string;
}

export class Deploy extends Task<void> {
	private stack: NitricStack;
	private region: string;

	constructor({ stack, region }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		this.region = region;
	}

	async do(): Promise<void> {
		const { stack, region } = this;
		const { functions = [], buckets = [], apis = [], topics = [], schedules = [], queues = [] } = stack;

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				stackName: stack.name,
				projectName: stack.name,
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// Create a new resource group for the nitric stack
						// This'll be used for basically everything we deploy in this stack
						const resourceGroup = new core.ResourceGroup(stack.name);

						// Deploy
						const appServicePlan = new appservice.Plan("examplePlan", {
							location: resourceGroup.location,
							resourceGroupName: resourceGroup.name,
							kind: "Linux",
							sku: {
								// many cheap... for development only
								// Will upgrade tiers/elasticity for different stack tiers e.g. dev/test/prod (prefab recipes)
								tier: "Basic",
								size: "B1",
							},
						});

						// Create a new storage account for this stack
						const account = new storage.Account(stack.name, {
							resourceGroupName: resourceGroup.name,
							accountTier: "Standard",
							accountReplicationType: "LRS",
						});

						

						// Not using references produced currently,
						// but leaving as map in case we need to reference in future
						buckets.map(b => createBucket(account, b));
						topics.map(t => createTopic(resourceGroup, t));

						// Deploy functions here...
						// need to determine our deployment method for them
						deployedFunctions = functions.map()


					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			});
			await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			await pulumiStack.setConfig('gcp:region', { value: region });
			// deploy the stack, log to console
			const upRes = await pulumiStack.up({ onOutput: this.update.bind(this) });
			console.log(upRes);
		} catch (e) {
			console.log(e);
		}
	}
}
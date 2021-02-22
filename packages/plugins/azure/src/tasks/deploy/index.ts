import { Stack, Task } from "@nitric/cli-common";
import { LocalWorkspace } from "@pulumi/pulumi/x/automation"
import { resources, storage, web, containerregistry } from "@pulumi/azure-nextgen";
import { createBucket } from "./bucket";
import { createTopic } from "./topic";
import { createFunctionAsApp } from "./function";
import { createQueue } from "./queue";
import { createAPI } from "./api";

interface DeployOptions {
	stack: Stack;
	region: string;
}

export class Deploy extends Task<void> {
	private stack: Stack;
	// private region: string;

	constructor({ stack }: DeployOptions) {
		super('Deploying Infrastructure');
		this.stack = stack;
		// this.region = region;
	}

	async do(): Promise<void> {
		const { stack } = this;
		const { buckets = [], apis = [], topics = [], schedules = [], queues = [] } = stack.asNitricStack();

		try {
			// Upload the stack to AWS
			const pulumiStack = await LocalWorkspace.createOrSelectStack({
				stackName: stack.getName(),
				projectName: stack.getName(),
				// generate our pulumi program on the fly from the POST body
				program: async () => {
					// Now we can start deploying with Pulumi
					try {
						// Create a new resource group for the nitric stack
						// This'll be used for basically everything we deploy in this stack
						const resourceGroup = new resources.latest.ResourceGroup(stack.getName(), {
							resourceGroupName: stack.getName(),
						});

						const registry = new containerregistry.latest.Registry(`${stack.getName()}-registry`, {
							resourceGroupName: resourceGroup.name,
							registryName: `${stack.getName()}-registry`,
							adminUserEnabled: true,
							sku: {
								name: "Basic"
							},
						});

						// Deploy
						const appServicePlan = new web.latest.AppServicePlan(`${stack.getName()}Plan`, {
							name: `${stack.getName()}Plan`,
							location: resourceGroup.location,
							resourceGroupName: resourceGroup.name,
							kind: "Linux",
							sku: {
								// for development only
								// Will upgrade tiers/elasticity for different stack tiers e.g. dev/test/prod (prefab recipes)
								tier: "Basic",
								size: "B1",
							},
						});

						// Create a new storage account for this stack
						const account = new storage.latest.StorageAccount(`${stack.getName()}-storage-account`, {
							resourceGroupName: resourceGroup.name,
							accountName: `${stack.getName()}-storage-account`,
							kind: "Storage",
							sku: {
								name: "Standard",
							}
						});

						// Not using references produced currently,
						// but leaving as map in case we need to reference in future
						buckets.map(b => createBucket(account, b));
						queues.map(q => createQueue(account, q));


						const deployedTopics = topics.map(t => createTopic(resourceGroup, t));

						// Deploy functions here...
						// need to determine our deployment method for them
						const deployedFunctions = stack.getFunctions().map(f => createFunctionAsApp(resourceGroup, registry, appServicePlan, f, deployedTopics));

						// TODO: Add schedule support

						apis.map(a => createAPI(resourceGroup, a, deployedFunctions))
					} catch (e) {
						console.error(e);
						throw e;
					}
				},
			});
			//await pulumiStack.setConfig('gcp:project', { value: gcpProject });
			//await pulumiStack.setConfig('gcp:region', { value: region });
			// deploy the stack, log to console
			const upRes = await pulumiStack.up({ onOutput: this.update.bind(this) });
			console.log(upRes);
		} catch (e) {
			console.log(e);
		}
	}
}
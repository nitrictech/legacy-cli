import * as azuread from '@pulumi/azuread';
//import * as random from '@pulumi/random';
import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';

interface NitricAzureServicePrincipalArgs {
	resourceGroup: azure.resources.ResourceGroup;
}

/**
 * Nitric Azure Storage based Bucket
 */
export class NitricAzureServicePrincipal extends pulumi.ComponentResource {
	public readonly name: string;
	public readonly servicePrincipalId: pulumi.Output<string>;
	public readonly resourceGroup: azure.resources.ResourceGroup;
	public readonly clientId: pulumi.Output<string>;
	public readonly tenantId: pulumi.Output<string>;
	public readonly clientSecret: pulumi.Output<string>;

	constructor(name: string, args: NitricAzureServicePrincipalArgs, opts?: pulumi.ComponentResourceOptions) {
		super('nitric:principal:AzureAD', name, {}, opts);
		const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };
		const { resourceGroup } = args;

		this.name = name;
		this.resourceGroup = resourceGroup;

		// create an application per service principal
		const app = new azuread.Application(
			`${name}-app`,
			{
				displayName: `${name}-app`,
			},
			defaultResourceOptions,
		);

		this.clientId = app.applicationId;

		const sp = new azuread.ServicePrincipal(
			`${name}-sp`,
			{
				applicationId: app.applicationId,
			},
			defaultResourceOptions,
		);

		this.tenantId = sp.applicationTenantId;

		//const pwd = new random.RandomPassword(`${name}-pwd`, {
		//	length: 20,
		//	special: true,
		//});

		this.servicePrincipalId = sp.id;

		const spPwd = new azuread.ServicePrincipalPassword(
			`${name}-sppwd`,
			{
				servicePrincipalId: sp.id,
			},
			defaultResourceOptions,
		);

		this.clientSecret = spPwd.value;

		// Finalize the deployment
		this.registerOutputs({
			resourceGroup: this.resourceGroup,
			clientId: this.clientId,
			tenantId: this.tenantId,
			clientSecret: this.clientSecret,
			servicePrincipalId: this.servicePrincipalId,
			name: this.name,
		});
	}
}

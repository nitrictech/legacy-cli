import * as pulumi from '@pulumi/pulumi';
import { NitricComputeCloudRun, NitricApiGcpApiGateway } from '.';

const outputToPromise = async <T>(output: pulumi.Output<T> | undefined): Promise<T | undefined> => {
	if (!output) {
		return undefined;
	}

	return await new Promise<T>((res) => {
		output.apply((t) => {
			res(t);
		});
	});
};

describe('NitricApiGcpApiGateway', () => {
	// Setup pulumi mocks
	beforeAll(() => {
		pulumi.runtime.setMocks({
			newResource: function ({ name, type, inputs }): { id: string; state: any } {
				switch (type) {
					case 'gcp:apigateway/api:Api':
						return {
							id: 'mock-api-id',
							state: {
								...inputs,
								// outputs...
								name: inputs.name || name + '-sg',
								apiId: 'mock-api-id',
							},
						};
					case 'gcp:apigateway/apiConfig:ApiConfig':
						return {
							id: 'mock-config-id',
							state: {
								...inputs,
								// outputs ...
								name: inputs.name || name + '-sg',
							},
						};
					case 'gcp:apigateway/gateway:Gateway':
						return {
							id: 'mock-gateway-id',
							state: {
								...inputs,
								// outputs ...
								name: inputs.name || name + '-sg',
								defaultHostName: 'example.com',
							},
						};
					case 'gcp:serviceAccount/account:Account':
						return {
							id: 'mock-account-id',
							state: {
								...inputs,
								// outputs ...
								name: inputs.name || name + '-sg',
								email: 'service.account@example.com',
							},
						};
					default:
						return {
							id: inputs.name + '_id',
							state: {
								...inputs,
							},
						};
				}
			},
			call: function ({ inputs }) {
				return inputs;
			},
		});
	});

	describe('When creating a new GcpApiGateway resource', () => {
		let api: NitricApiGcpApiGateway | null = null;
		beforeAll(() => {
			// Create the new Api Gateway resource
			api = new NitricApiGcpApiGateway('my-gateway', {
				api: {
					swagger: '2.0',
					info: {
						title: 'test-api',
						version: '2.0',
					},
					paths: {
						'/example/': {
							get: {
								operationId: 'getExample',
								'x-nitric-target': {
									name: 'test-service',
									type: 'function',
								},
								description: 'Retrieve an existing example',
								responses: {
									'200': {
										description: 'Successful response',
									},
								},
							},
						},
					},
				},
				services: [
					{
						name: 'test-service',
						url: pulumi.output('https://example.com'),
						cloudrun: {
							name: 'test',
							location: 'us-central-1',
						} as unknown,
					} as NitricComputeCloudRun,
				],
			});
		});

		// Assert its state
		it('should create a new Api', async () => {
			expect(api?.api).toBeDefined();
			await expect(outputToPromise(api?.api.name)).resolves.toEqual('my-gateway-sg');
		});

		it('should create a new api config', async () => {
			expect(api?.config).toBeDefined();
			await expect(outputToPromise(api?.config.name)).resolves.toEqual('my-gateway-config-sg');

			// asset config has correct parent api
			await expect(outputToPromise(api?.config.api)).resolves.toEqual('mock-api-id');
		});

		it('should create a new gateway', async () => {
			expect(api?.gateway).toBeDefined();
			await expect(outputToPromise(api?.gateway.name)).resolves.toEqual('my-gateway-gateway-sg');

			// Assert gateway has correct config
			const configId = await outputToPromise(api?.config.id);
			await expect(outputToPromise(api?.gateway.apiConfig)).resolves.toEqual(configId);
		});

		it('should create a new Iam account', async () => {
			expect(api?.invoker).toBeDefined();
			await expect(outputToPromise(api?.invoker.name)).resolves.toEqual('my-gateway-acct-sg');
			await expect(outputToPromise(api?.invoker.email)).resolves.toEqual('service.account@example.com');
		});

		it('should create iam members for the invoker account for each provided service', async () => {
			expect(api?.memberships).toHaveLength(1);

			// Assert service account wired up correctly
			await expect(outputToPromise(api?.memberships[0].member)).resolves.toEqual(
				'serviceAccount:service.account@example.com',
			);
		});
	});
});

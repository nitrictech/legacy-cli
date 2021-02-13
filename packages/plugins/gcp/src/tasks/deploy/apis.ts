import { NitricAPI, NitricAPITarget } from "@nitric/cli-common";
import { DeployedApi, DeployedFunction } from "./types";
import { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import Converter from "api-spec-converter";
import { apigateway } from "@pulumi/gcp";
import pulumi from "@pulumi/pulumi";
import { translate } from "googleapis/build/src/apis/translate";

type method = "get" | "post" | "put" | "patch" | "delete";

const METHOD_KEYS: method[] = ["get", "post", "put", "patch", "delete"];

interface GoogleExtensions {
  'x-google-backend': {
    address: string
  }
}

async function transformOpenApiSpec(api: NitricAPI, funcs: DeployedFunction[]): Promise<pulumi.Output<string>> {
  const { name, ...spec } = api;

  // Convert to swagger
  const { spec: translatedApi }: { spec: OpenAPIV2.Document<NitricAPITarget> } = await Converter.convert({
    from: "openapi_3",
    to: "swagger_2",
    source: spec,
  });

  // Transform the spec and base64 encode
  const transformedDoc = pulumi
		.all(funcs.map((f) => f.cloudRun.statuses.apply(([s]) => `${f.name}||${s.url}`)))
		.apply((nameUrlPairs) => {
			const transformedApi = {
        ...translatedApi,
        // Update the spec paths
				paths: Object.keys(translatedApi.paths).reduce((acc, pathKey) => {
          const path: OpenAPIV2.PathItemObject<NitricAPITarget> = translatedApi.paths[pathKey]!;
          
          // Interpolate the new methods
					const newMethods = Object.keys(path)
						.filter((k) => METHOD_KEYS.includes(k as method))
						.reduce((acc, method) => {
							const p = path[method as method]!;

							// The name of the function we want to target with this APIGateway
							const targetName = p['x-nitric-target'].name;

							const invokeUrlPair = nameUrlPairs.find((f) => f.split('||')[0] === targetName);

							if (!invokeUrlPair) {
								throw new Error(`Invalid nitric target ${targetName} defined in api: ${api.name}`);
							}

							const [name, url] = invokeUrlPair.split('||');
							// Discard the old key on the transformed API
							const { 'x-nitric-target': _, ...rest } = p;

							// console.log("invokeArn:", invokeArn);

							return {
                ...acc,
                // Inject the new method with translated nitric target
								[method]: {
                  ...(rest as OpenAPIV2.OperationObject),
                  'x-google-backend': {
                    address: url
                  },
								} as any,
							};
						}, {} as { [key: string]: OpenAPIV2.OperationObject<GoogleExtensions> });

					return {
						...acc,
						[pathKey]: {
							...path,
							...newMethods,
						} as OpenAPIV2.OperationObject<GoogleExtensions>,
					} as any;
				}, {} as OpenAPIV2.PathsObject<GoogleExtensions>),
			};

      // Base64 encode here as well
      return Buffer.from(JSON.stringify(transformedApi)).toString('base64')
    });

  return transformedDoc;
}

export async function createApi(api: NitricAPI, funcs: DeployedFunction[]): Promise<DeployedApi> {
  const b64Spec = await transformOpenApiSpec(api, funcs)

  // Deploy the API
  const deployedApi = new apigateway.Api(api.name, {
    apiId: api.name,
  });

  // Now we need to create the document provided and interpolate the deployed function targets
  // i.e. their Urls...
  // Deploy the config
  const deployedConfig = new apigateway.ApiConfig(`${api.name}-config`, {
    api: deployedApi.apiId,
    openapiDocuments: [{
      document: {
        path: "openapi.json",
        contents: b64Spec,
      }
    }]
  });

  // Deploy the gateway
  const deployedGateway = new apigateway.Gateway(`${api.name}-gateway`, {
    gatewayId: `${api.name}-gateway`,
    apiConfig: deployedConfig.apiConfigId,
  });

  return {
    ...api,
    gateway: deployedGateway
  };
};

/**
 * Creates the API container that will be used to store and manage the API Gateway and Configs
 * NOTE: We create this as a seperate action as we must wait for the APIs full creation before we can begin
 * creating resources related to it.
 */
export function createAPI(stackName: string, gcpProject: string): any[] {
  const apiParent = `projects/${gcpProject}/locations/global`;
  const apiId = `${stackName}-api`;
  // const apiName = `${apiParent}/apis/${apiId}`;
  // First we create the API for the stack (We cannot store configs without it)
  const api = {
    type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.apis`,
    name: apiId,
    properties: {
      parent: apiParent,
      displayName: apiId,
      apiId: apiId,
    }
  };

  return [
    api
  ];
}

/**
 * Creates a template for a new API in Google Cloud API Gateway
 * from a nitric stack definition
 */
export async function createAPIGateways(stackName: string, region: string, gcpProject: string, apiName: string, apis: NitricAPI[], funcs: DeployedFunction[]): Promise<any[]> {
  let resources = [] as any[];

  if (apis.length > 0) {
    // Step 0: Interpolate the given document
    // We need to inject given backend target values into the document
    // in this case it will be CloudRun URLs from our previous core service deployment
    const deployeableApis = await Promise.all(apis.map(async (api) => {
      // TODO: Interpolate target values here...
      const newPaths = Object.keys(api.paths).reduce((acc, pathKey) => {
        const path = api.paths[pathKey]!;

        const newMethods = Object.keys(path).filter(k => METHOD_KEYS.includes(k as method)).reduce((acc, method) => {
          const p = path[method];
          // Get the target deployed method
          // TODO: Throw error if not found
          const deployedFunction = funcs.find(f => f.name === p["x-nitric-target"].name)

          if (!deployedFunction) {
            throw new Error(`Misconfiguration error: defined function target ${JSON.stringify(p["x-nitric-target"])} that does not exist in: ${JSON.stringify(funcs)}`);
          }

          // Discard the old key on the transformed API
          const { "x-nitric-target": _, ...rest } = p;

          return {
            ...acc,
            [method]: {
              ...(rest) as OpenAPIV3.OperationObject,
              'x-google-backend': {
                address: deployedFunction.endpoint
              }
            } as OpenAPIV3.OperationObject<GoogleExtensions>
          };
        }, {} as { [key: string]: OpenAPIV3.OperationObject<GoogleExtensions> });

        return {
          ...acc,
          [pathKey]: {
            ...path,
            ...newMethods,
          } as OpenAPIV3.OperationObject<GoogleExtensions>
        };
      }, {} as OpenAPIV3.PathsObject<GoogleExtensions>);

      const translatedApi = await Converter.convert({
        from: "openapi_3",
        to: "swagger_2",
        source: {
          ...api,
          paths: newPaths,
        } as OpenAPIV3.Document<GoogleExtensions>
      });

      return translatedApi.spec;
    }));

    // Create one config and gateway per api defintion
    resources = [
      ...resources,
      ...deployeableApis.reduce((acc, {name, ...api}) => {
        const apiConfigParent = apiName;
        const apiConfigId = `${stackName}-${name}-apiconfig`;
        const apiConfigName = `${apiConfigParent}/configs/${apiConfigId}`;
        return [
          ...acc,
          {
            type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.apis.configs`,
            name: apiConfigId,
            properties: {
              parent: apiConfigParent,
              displayName: apiConfigId,
              apiConfigId: apiConfigId,
              // TODO: Get the run invoker account details here (same as used for the subscription services...)
              // XXX: Can possibly use a single invoker for all functions here in our API gateway...
              // i.e. create a dedicated api gateway invoker
              gatewayServiceAccount: '$(ref.nitric-invoker.email)',
              // We can actually specify everything here
              // Map them into base64 encoded documents
              openapiDocuments: [{
                document: {
                  path: `${stackName}-${name}.json`,
                  contents: Buffer.from(JSON.stringify(api)).toString('base64'),
                }
              }],
            }
          }, {
            type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.gateways`,
            name: `${stackName}-${name}-gateway`,
            properties: {
              gatewayId: `${stackName}-${name}-gateway`,
              parent: `projects/${gcpProject}/locations/${region}`,
              displayName: `${stackName}-${name}-gateway`,
              apiConfig: apiConfigName
            },
            metadata: {
              dependsOn: [apiConfigId]
            }
          }
        ]
      }, [] as any[])
    ];
  }

  // Step 2: Create
  return resources;
}
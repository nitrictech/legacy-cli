import { NitricAPI } from "@nitric/cli-common";
import { DeployedFunction } from "./types";
import { OpenAPIV3 } from "openapi-types";
import Converter from "api-spec-converter";

type method = "get" | "post" | "put" | "patch" | "delete";

const METHOD_KEYS: method[] = ["get", "post", "put", "patch", "delete"]

interface GoogleExtensions {
  'x-google-backend': {
    address: string
  }
}

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
    

    // Step 1: Create the API config
    // To do this we need to upload the API gateway config seperately
    // Also to do this we will need to URLs of the cloud run functions
    // We can actually create a single gateway for the entire stack that contains all
    // of the defined API files together under one endpoint...
    // FIXME: looks like we'll need to use a polling solution for this
    // As the API does not create in time...
    // const apiConfigParent = apiName;
    // const apiConfigId = `${stackName}-apiconfig`;
    // const apiConfigName = `${apiConfigParent}/configs/${apiConfigId}`;
    // const openApiConfig = {
    //   type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.apis.configs`,
    //   name: `${stackName}-apiconfig`,
    //   properties: {
    //     parent: apiConfigParent,
    //     displayName: apiConfigId,
    //     apiConfigId: apiConfigId,
    //     // TODO: Get the run invoker account details here (same as used for the subscription services...)
    //     // XXX: Can possibly use a single invoker for all functions here in our API gateway...
    //     // i.e. create a dedicated api gateway invoker
    //     gatewayServiceAccount: '$(ref.nitric-invoker.email)',
    //     // We can actually specify everything here
    //     // Map them into base64 encoded documents
    //     openapiDocuments: translatedApis.map(tapi => {
    //       return {
    //         document: {
    //           path: `${stackName}.json`,
    //           contents: Buffer.from(JSON.stringify(tapi.spec)).toString('base64'),
    //         }
    //       }
    //     }),
    //   }
    // };
    
    // // Now we create the API gateway references the created config above
    // const apiGateway = {
    //   type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.gateways`,
    //   name: `${stackName}-gateway`,
    //   properties: {
    //     gatewayId: `${stackName}-gateway`,
    //     parent: `projects/${gcpProject}/locations/${region}`,
    //     displayName: `${stackName}-gateway`,
    //     apiConfig: apiConfigName
    //   },
    //   metadata: {
    //     dependsOn: [apiConfigId]
    //   }
    // };

    // resources = [
    //   openApiConfig,
    //   apiGateway,
    // ] as any[];
  }

  // Step 2: Create
  return resources;
}
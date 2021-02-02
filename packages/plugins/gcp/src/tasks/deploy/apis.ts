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
 * Creates a template for a new API in Google Cloud API Gateway
 * from a nitric stack definition
 */
export default async function(stackName: string, gcpProject: string, region: string, apis: NitricAPI[], funcs: DeployedFunction[]): Promise<any[]> {
  let resources = [] as any[];

  if (apis.length > 0) {
    // Step 0: Interpolate the given document
    // We need to inject given backend target values into the document
    // in this case it will be CloudRun URLs from our previous core service deployment
    const transformedAPIs = apis.map((api) => {
      // TODO: Interpolate target values here...
      const newPaths = Object.keys(api.paths).reduce((acc, pathKey) => {
        const path = api.paths[pathKey]!;

        const newMethods = Object.keys(path).filter(k => METHOD_KEYS.includes(k as method)).reduce((acc, method) => {
          const p = path[method];
          // Get the target deployed method
          // TODO: Throw error if not found
          const deployedFunction = funcs.find(f => f.name === p["x-nitric-target"].name)

          if (!deployedFunction) {
            throw new Error("Misconfiguration error: defined function target that does not exist!");
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

      return {
        ...api,
        paths: newPaths,
      } as OpenAPIV3.Document<GoogleExtensions>;
    });

    // First we create the API for the stack (We cannot store configs without it)
    const api = {
      type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.apis`,
      name: `${stackName}-api`,
      properties: {
        parent: `projects/${gcpProject}/locations/${region}`,
        displayName: `${stackName}-api`
      }
    };

    const translatedApis = await Promise.all(transformedAPIs.map(api => {
      return Converter.convert({
        from: "openapi_3",
        to: "swagger_2",
        source: api
      });
    }));

    // Step 1: Create the API config
    // To do this we need to upload the API gateway config seperately
    // Also to do this we will need to URLs of the cloud run functions
    // We can actually create a single gateway for the entire stack that contains all
    // of the defined API files together under one endpoint...
    const openApiConfig = {
      type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.apis.configs`,
      name: `${stackName}-apiConfig`,
      properties: {
        parent: `$(ref.${stackName}-api.name)`,
        displayName: `${stackName}-apiConfig`,
        // TODO: Get the run invoker account details here (same as used for the subscription services...)
        // XXX: Can possibly use a single invoker for all functions here in our API gateway...
        // i.e. create a dedicated api gateway invoker
        gatewayServiceAccount: '$(ref.nitric-invoker.email)',
        // We can actually specify everything here
        // Map them into base64 encoded documents
        openapiDocuments: translatedApis.map(tapi => {
          return {
            document: {
              contents: Buffer.from(JSON.stringify(tapi)).toString('base64')
            }
          }
        }),
      }
    };
    
    // Now we create the API gateway references the created config above
    const apiGateway = {
      type: `${gcpProject}/nitric-cloud-apigateway:projects.locations.gateway`,
      name: `${stackName}-gateway`,
      properties: {
        displayName: `${stackName}-gateway`,
        apiConfig: `$(ref.${stackName}-apiConfig.name)`
      }
    };

    resources = [
      api,
      openApiConfig,
      apiGateway,
    ] as any[];
  }

  // Step 2: Create
  return resources;
}
import { NitricStack } from "@nitric/cli-common";

/**
 * Creates a template for a new API in Google Cloud API Gateway
 * from a nitric stack definition
 */
export default function(gcpProject: string, region: string, { name: stackName, apis = []}: NitricStack): any[] {
  let resources = [] as any[];

  if (apis.length > 0) {
    // Step 0: Interpolate the given document
    // We need to inject given backend target values into the document
    // in this case it will be CloudRun URLs from our previous core service deployment

    const transformedAPIs = apis.map((api) => {
      // TODO: Interpolate target values here...
      return api;
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
        gatewayServiceAccount: "id@project.iam.gserviceaccount.com",
        // We can actually specify everything here
        // Map them into base64 encoded documents
        openapiDocuments: transformedAPIs.map(tapi => {
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
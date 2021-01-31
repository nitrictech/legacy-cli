import { OpenAPIV3 } from "openapi-types";

// Inject referencable NitricStack metadata into the OpenAPI typing
// This will extend at the point of an operations object...
// Using this we can find the appropriate backend reference
// in each of the cloud plugins during deployment
interface NitricAPITarget {
  "x-nitric-target": {
    name: string;
    type: "function";
  }
}

export interface NitricAPI extends OpenAPIV3.Document<NitricAPITarget> {
  // The name of the API...
  name: string;
}
import { NitricAPI, NitricFunction, normalizeFunctionName } from "@nitric/cli-common";
import { OpenAPIV3 } from "openapi-types";
import { uniq } from "lodash";

type method = "get" | "post" | "put" | "patch" | "delete";
const METHOD_KEYS: method[] = ["get", "post", "put", "patch", "delete"]

type AwsApiGatewayIntegrationType = "http" | "http_proxy" | "aws" | "aws_proxy" | "mock";
type AwsApiGatewayHttpMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Basic type definitions for AWS OpenAPI extensions
// https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
interface AwsExtentions {
  'x-amazon-apigateway-integration': {
    uri: string | object;
    responses?: any;
    passthroughBehaviour?: string;
    httpMethod: AwsApiGatewayHttpMethods;
    timeoutInMillis?: number;
    contentHandling?: string;
    type: AwsApiGatewayIntegrationType;
  }
}

/**
 * Creates a new API Gateway definition for a nitric stack
 */
export default function(api: NitricAPI, funcs: NitricFunction[]) {
  const { name, ...rest } = api;

  const functionNames = funcs.map(f => f.name);
  
  const transformedApi = {
    ...rest,
    paths: Object.keys(api.paths).reduce((acc, pathKey) => {
      const path = api.paths[pathKey]!;
      const newMethods = Object.keys(path).filter(k => METHOD_KEYS.includes(k as method)).reduce((acc, method) => {
        const p = path[method];

        // The name of the function we want to target with this APIGateway
        const targetName = p["x-nitric-target"].name;

        if (!(functionNames.includes(targetName))) {
          throw new Error(`Invalid nitric target ${targetName} defined in api: ${api.name}`);
        }

        const lambdaName = normalizeFunctionName({ name: targetName } as any) + 'LambdaDef';
        // Reconcile the AWS Lambda URN for functions here...

        // Discard the old key on the transformed API
        const { "x-nitric-target": _, ...rest } = p;

        return {
          ...acc,
          [method]: {
            ...(rest) as OpenAPIV3.OperationObject,
            'x-amazon-apigateway-integration': {
              type: 'aws_proxy',
              httpMethod: 'POST',
              payloadFormatVersion: '2.0',
              uri: {
                'Fn::Sub': `arn:\${AWS::Partition}:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${${lambdaName}.Arn}/invocations`,
              },
            },
          } as any // OpenAPIV3.OperationObject<AwsExtentions>
        };
      }, {} as { [key: string]: OpenAPIV3.OperationObject<AwsExtentions> });

      return {
        ...acc,
        [pathKey]: {
          ...path,
          ...newMethods,
        } as OpenAPIV3.OperationObject<AwsExtentions>
        
      } as any;
    }, {} as OpenAPIV3.PathsObject<AwsExtentions>)
  }

  const targets = uniq(Object.keys(api.paths).reduce((acc, key) => {
    const path = api.paths[key]!;

    const pathTargets = Object.keys(path).filter(k => METHOD_KEYS.includes(k as method)).reduce((acc, m) => {
      const p = path[m];
      return [ ...acc, p["x-nitric-target"].name ];
      
    }, [] as string[]);

    return [
      ...acc,
      ...pathTargets,
    ];
  }, [] as string[]));

  const lambdaPermissions = targets.reduce((acc, t) => {
    return {
      [`${t}LambdaPermissionDef`]: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
        Action: 'lambda:InvokeFunction',
        FunctionName: {
          Ref: normalizeFunctionName({ name: t } as any) + 'LambdaDef',
        },
          Principal: 'apigateway.amazonaws.com',
          SourceArn: {
            'Fn::Sub': [
              'arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${__ApiId__}/${__Stage__}/*',
              {
                __ApiId__: {
                  Ref: `${name}API`,
                },
                __Stage__: '*',
              },
            ],
          },
        },
      },
      ...acc,
    };
  }, {});

  return {
    [`${name}API`]: {
      Type : "AWS::ApiGatewayV2::Api",
      Properties: {
        // ApiKeySourceType : String,
        // BinaryMediaTypes : [ String, ... ],
        Body : transformedApi, // XXX: Put the api spec here...,
        // BodyS3Location : S3Location,
        // CloneFrom : String,
        // CredentialsArn
        // Description : `API ${name}`,
        // EndpointConfiguration : EndpointConfiguration,
        // FailOnWarnings : Boolean,
        // MinimumCompressionSize : Integer,
        // Name : `${stackName}`,
        // Parameters : {Key : Value, ...},
        // Policy : Json,
        // Tags : [ Tag, ... ]
      }
    },
    ...lambdaPermissions,
    [`${name}APIDeployment`]: {
      Type: 'AWS::ApiGatewayV2::Stage',
			Properties: {
				ApiId: {
					Ref: `${name}API`,
				},
				StageName: '$default',
				Tags: {
					'httpapi:createdBy': 'Nitric',
				},
				AutoDeploy: true,
			},
    },
  };
}
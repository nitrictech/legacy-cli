// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { JSONSchema7 } from 'json-schema';
import ajv, { DefinedError } from 'ajv';
import { NitricStack } from '../types';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { StackAPIDocument } from './api';

/**
 * Pattern for stack resources names, e.g. func names, topic names, buckets, etc.
 */
export const resourceNamePattern = /^\w+([.\\-]\w+)*$/.toString().slice(1, -1);
/**
 * CRON expression string pattern
 */
export const cronExpressionPattern = /^.*$/.toString().slice(1, -1);

/**
 * OpenAPI 3.0 Schema, with Nitric extensions added, such as x-nitric-target
 */
const OPENAPI_3_SCHEMA: JSONSchema7 = {
	$id: 'https://spec.openapis.org/oas/3.0/schema/2019-04-02',
	//$schema: 'http://json-schema.org/draft-04/schema#',
	description: 'Validation schema for OpenAPI Specification 3.0.X.',
	type: 'object',
	required: ['openapi', 'info', 'paths'],
	properties: {
		openapi: {
			type: 'string',
			pattern: '^3\\.0\\.\\d(-.+)?$',
		},
		info: {
			$ref: '#/definitions/Info',
		},
		externalDocs: {
			$ref: '#/definitions/ExternalDocumentation',
		},
		servers: {
			type: 'array',
			items: {
				$ref: '#/definitions/Server',
			},
		},
		security: {
			type: 'array',
			items: {
				$ref: '#/definitions/SecurityRequirement',
			},
		},
		tags: {
			type: 'array',
			items: {
				$ref: '#/definitions/Tag',
			},
			uniqueItems: true,
		},
		paths: {
			$ref: '#/definitions/Paths',
		},
		components: {
			$ref: '#/definitions/Components',
		},
	},
	patternProperties: {
		'^x-': {},
	},
	additionalProperties: false,
	definitions: {
		Reference: {
			type: 'object',
			required: ['$ref'],
			patternProperties: {
				'^\\$ref$': {
					type: 'string',
					format: 'uri-reference',
				},
			},
		},
		Info: {
			type: 'object',
			required: ['title', 'version'],
			properties: {
				title: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				termsOfService: {
					type: 'string',
					format: 'uri-reference',
				},
				contact: {
					$ref: '#/definitions/Contact',
				},
				license: {
					$ref: '#/definitions/License',
				},
				version: {
					type: 'string',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Contact: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
				},
				url: {
					type: 'string',
					format: 'uri-reference',
				},
				email: {
					type: 'string',
					format: 'email',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		License: {
			type: 'object',
			required: ['name'],
			properties: {
				name: {
					type: 'string',
				},
				url: {
					type: 'string',
					format: 'uri-reference',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Server: {
			type: 'object',
			required: ['url'],
			properties: {
				url: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				variables: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/ServerVariable',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		ServerVariable: {
			type: 'object',
			required: ['default'],
			properties: {
				enum: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
				default: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Components: {
			type: 'object',
			properties: {
				schemas: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Schema',
								},
								{
									$ref: '#/definitions/Reference',
								},
							],
						},
					},
				},
				responses: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Response',
								},
							],
						},
					},
				},
				parameters: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Parameter',
								},
							],
						},
					},
				},
				examples: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Example',
								},
							],
						},
					},
				},
				requestBodies: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/RequestBody',
								},
							],
						},
					},
				},
				headers: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Header',
								},
							],
						},
					},
				},
				securitySchemes: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/SecurityScheme',
								},
							],
						},
					},
				},
				links: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Link',
								},
							],
						},
					},
				},
				callbacks: {
					type: 'object',
					patternProperties: {
						'^[a-zA-Z0-9\\.\\-_]+$': {
							oneOf: [
								{
									$ref: '#/definitions/Reference',
								},
								{
									$ref: '#/definitions/Callback',
								},
							],
						},
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Schema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
				},
				multipleOf: {
					type: 'number',
					minimum: 0,
					// exclusiveMinimum: true
				},
				maximum: {
					type: 'number',
				},
				exclusiveMaximum: {
					type: 'boolean',
					default: false,
				},
				minimum: {
					type: 'number',
				},
				exclusiveMinimum: {
					type: 'boolean',
					default: false,
				},
				maxLength: {
					type: 'integer',
					minimum: 0,
				},
				minLength: {
					type: 'integer',
					minimum: 0,
					default: 0,
				},
				pattern: {
					type: 'string',
					format: 'regex',
				},
				maxItems: {
					type: 'integer',
					minimum: 0,
				},
				minItems: {
					type: 'integer',
					minimum: 0,
					default: 0,
				},
				uniqueItems: {
					type: 'boolean',
					default: false,
				},
				maxProperties: {
					type: 'integer',
					minimum: 0,
				},
				minProperties: {
					type: 'integer',
					minimum: 0,
					default: 0,
				},
				required: {
					type: 'array',
					items: {
						type: 'string',
					},
					minItems: 1,
					uniqueItems: true,
				},
				enum: {
					type: 'array',
					items: {},
					minItems: 1,
					uniqueItems: false,
				},
				type: {
					type: 'string',
					enum: ['array', 'boolean', 'integer', 'number', 'object', 'string'],
				},
				not: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				allOf: {
					type: 'array',
					items: {
						oneOf: [
							{
								$ref: '#/definitions/Schema',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				oneOf: {
					type: 'array',
					items: {
						oneOf: [
							{
								$ref: '#/definitions/Schema',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				anyOf: {
					type: 'array',
					items: {
						oneOf: [
							{
								$ref: '#/definitions/Schema',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				items: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				properties: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Schema',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				additionalProperties: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
						{
							type: 'boolean',
						},
					],
					default: true,
				},
				description: {
					type: 'string',
				},
				format: {
					type: 'string',
				},
				default: {},
				nullable: {
					type: 'boolean',
					default: false,
				},
				discriminator: {
					$ref: '#/definitions/Discriminator',
				},
				readOnly: {
					type: 'boolean',
					default: false,
				},
				writeOnly: {
					type: 'boolean',
					default: false,
				},
				example: {},
				externalDocs: {
					$ref: '#/definitions/ExternalDocumentation',
				},
				deprecated: {
					type: 'boolean',
					default: false,
				},
				xml: {
					$ref: '#/definitions/XML',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Discriminator: {
			type: 'object',
			required: ['propertyName'],
			properties: {
				propertyName: {
					type: 'string',
				},
				mapping: {
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
			},
		},
		XML: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
				},
				namespace: {
					type: 'string',
					format: 'uri',
				},
				prefix: {
					type: 'string',
				},
				attribute: {
					type: 'boolean',
					default: false,
				},
				wrapped: {
					type: 'boolean',
					default: false,
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Response: {
			type: 'object',
			required: ['description'],
			properties: {
				description: {
					type: 'string',
				},
				headers: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Header',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				content: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/MediaType',
					},
				},
				links: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Link',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		MediaType: {
			type: 'object',
			properties: {
				schema: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				example: {},
				examples: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Example',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				encoding: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/Encoding',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
			allOf: [
				{
					$ref: '#/definitions/ExampleXORExamples',
				},
			],
		},
		Example: {
			type: 'object',
			properties: {
				summary: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				value: {},
				externalValue: {
					type: 'string',
					format: 'uri-reference',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Header: {
			type: 'object',
			properties: {
				description: {
					type: 'string',
				},
				required: {
					type: 'boolean',
					default: false,
				},
				deprecated: {
					type: 'boolean',
					default: false,
				},
				allowEmptyValue: {
					type: 'boolean',
					default: false,
				},
				style: {
					type: 'string',
					enum: ['simple'],
					default: 'simple',
				},
				explode: {
					type: 'boolean',
				},
				allowReserved: {
					type: 'boolean',
					default: false,
				},
				schema: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				content: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/MediaType',
					},
					minProperties: 1,
					maxProperties: 1,
				},
				example: {},
				examples: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Example',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
			allOf: [
				{
					$ref: '#/definitions/ExampleXORExamples',
				},
				{
					$ref: '#/definitions/SchemaXORContent',
				},
			],
		},
		Paths: {
			type: 'object',
			patternProperties: {
				'^\\/': {
					$ref: '#/definitions/PathItem',
				},
				'^x-': {},
			},
			additionalProperties: false,
		},
		PathItem: {
			type: 'object',
			properties: {
				$ref: {
					type: 'string',
				},
				summary: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				servers: {
					type: 'array',
					items: {
						$ref: '#/definitions/Server',
					},
				},
				parameters: {
					type: 'array',
					items: {
						oneOf: [
							{
								$ref: '#/definitions/Parameter',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
					uniqueItems: true,
				},
			},
			patternProperties: {
				'^(get|put|post|delete|options|head|patch|trace)$': {
					$ref: '#/definitions/Operation',
				},
				'^x-': {},
			},
			additionalProperties: false,
		},
		Operation: {
			type: 'object',
			required: ['responses'],
			properties: {
				'x-nitric-target': {
					description: 'target nitric resource for the operation.',
					type: 'object',
					properties: {
						name: {
							type: 'string',
							pattern: resourceNamePattern,
						},
						type: {
							type: 'string',
							enum: ['function', 'container'],
						},
					},
					required: ['name', 'type'],
					additionalProperties: false,
				},
				tags: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
				summary: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				externalDocs: {
					$ref: '#/definitions/ExternalDocumentation',
				},
				operationId: {
					type: 'string',
				},
				parameters: {
					type: 'array',
					items: {
						oneOf: [
							{
								$ref: '#/definitions/Parameter',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
					uniqueItems: true,
				},
				requestBody: {
					oneOf: [
						{
							$ref: '#/definitions/RequestBody',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				responses: {
					$ref: '#/definitions/Responses',
				},
				callbacks: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Callback',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
				deprecated: {
					type: 'boolean',
					default: false,
				},
				security: {
					type: 'array',
					items: {
						$ref: '#/definitions/SecurityRequirement',
					},
				},
				servers: {
					type: 'array',
					items: {
						$ref: '#/definitions/Server',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Responses: {
			type: 'object',
			properties: {
				default: {
					oneOf: [
						{
							$ref: '#/definitions/Response',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
			},
			patternProperties: {
				'^[1-5](?:\\d{2}|XX)$': {
					oneOf: [
						{
							$ref: '#/definitions/Response',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				'^x-': {},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		SecurityRequirement: {
			type: 'object',
			additionalProperties: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
		},
		Tag: {
			type: 'object',
			required: ['name'],
			properties: {
				name: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				externalDocs: {
					$ref: '#/definitions/ExternalDocumentation',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		ExternalDocumentation: {
			type: 'object',
			required: ['url'],
			properties: {
				description: {
					type: 'string',
				},
				url: {
					type: 'string',
					format: 'uri-reference',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		ExampleXORExamples: {
			description: 'Example and examples are mutually exclusive',
			not: {
				required: ['example', 'examples'],
			},
		},
		SchemaXORContent: {
			description: 'Schema and content are mutually exclusive, at least one is required',
			not: {
				required: ['schema', 'content'],
			},
			oneOf: [
				{
					required: ['schema'],
				},
				{
					required: ['content'],
					description: 'Some properties are not allowed if content is present',
					allOf: [
						{
							not: {
								required: ['style'],
							},
						},
						{
							not: {
								required: ['explode'],
							},
						},
						{
							not: {
								required: ['allowReserved'],
							},
						},
						{
							not: {
								required: ['example'],
							},
						},
						{
							not: {
								required: ['examples'],
							},
						},
					],
				},
			],
		},
		Parameter: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
				},
				in: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				required: {
					type: 'boolean',
					default: false,
				},
				deprecated: {
					type: 'boolean',
					default: false,
				},
				allowEmptyValue: {
					type: 'boolean',
					default: false,
				},
				style: {
					type: 'string',
				},
				explode: {
					type: 'boolean',
				},
				allowReserved: {
					type: 'boolean',
					default: false,
				},
				schema: {
					oneOf: [
						{
							$ref: '#/definitions/Schema',
						},
						{
							$ref: '#/definitions/Reference',
						},
					],
				},
				content: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/MediaType',
					},
					minProperties: 1,
					maxProperties: 1,
				},
				example: {},
				examples: {
					type: 'object',
					additionalProperties: {
						oneOf: [
							{
								$ref: '#/definitions/Example',
							},
							{
								$ref: '#/definitions/Reference',
							},
						],
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
			required: ['name', 'in'],
			allOf: [
				{
					$ref: '#/definitions/ExampleXORExamples',
				},
				{
					$ref: '#/definitions/SchemaXORContent',
				},
				{
					$ref: '#/definitions/ParameterLocation',
				},
			],
		},
		ParameterLocation: {
			description: 'Parameter location',
			oneOf: [
				{
					description: 'Parameter in path',
					required: ['required'],
					properties: {
						in: {
							enum: ['path'],
						},
						style: {
							enum: ['matrix', 'label', 'simple'],
							default: 'simple',
						},
						required: {
							enum: [true],
						},
					},
				},
				{
					description: 'Parameter in query',
					properties: {
						in: {
							enum: ['query'],
						},
						style: {
							enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
							default: 'form',
						},
					},
				},
				{
					description: 'Parameter in header',
					properties: {
						in: {
							enum: ['header'],
						},
						style: {
							enum: ['simple'],
							default: 'simple',
						},
					},
				},
				{
					description: 'Parameter in cookie',
					properties: {
						in: {
							enum: ['cookie'],
						},
						style: {
							enum: ['form'],
							default: 'form',
						},
					},
				},
			],
		},
		RequestBody: {
			type: 'object',
			required: ['content'],
			properties: {
				description: {
					type: 'string',
				},
				content: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/MediaType',
					},
				},
				required: {
					type: 'boolean',
					default: false,
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		SecurityScheme: {
			oneOf: [
				{
					$ref: '#/definitions/APIKeySecurityScheme',
				},
				{
					$ref: '#/definitions/HTTPSecurityScheme',
				},
				{
					$ref: '#/definitions/OAuth2SecurityScheme',
				},
				{
					$ref: '#/definitions/OpenIdConnectSecurityScheme',
				},
			],
		},
		APIKeySecurityScheme: {
			type: 'object',
			required: ['type', 'name', 'in'],
			properties: {
				type: {
					type: 'string',
					enum: ['apiKey'],
				},
				name: {
					type: 'string',
				},
				in: {
					type: 'string',
					enum: ['header', 'query', 'cookie'],
				},
				description: {
					type: 'string',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		HTTPSecurityScheme: {
			type: 'object',
			required: ['scheme', 'type'],
			properties: {
				scheme: {
					type: 'string',
				},
				bearerFormat: {
					type: 'string',
				},
				description: {
					type: 'string',
				},
				type: {
					type: 'string',
					enum: ['http'],
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
			oneOf: [
				{
					description: 'Bearer',
					properties: {
						scheme: {
							enum: ['bearer'],
						},
					},
				},
				{
					description: 'Non Bearer',
					not: {
						required: ['bearerFormat'],
					},
					properties: {
						scheme: {
							not: {
								enum: ['bearer'],
							},
						},
					},
				},
			],
		},
		OAuth2SecurityScheme: {
			type: 'object',
			required: ['type', 'flows'],
			properties: {
				type: {
					type: 'string',
					enum: ['oauth2'],
				},
				flows: {
					$ref: '#/definitions/OAuthFlows',
				},
				description: {
					type: 'string',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		OpenIdConnectSecurityScheme: {
			type: 'object',
			required: ['type', 'openIdConnectUrl'],
			properties: {
				type: {
					type: 'string',
					enum: ['openIdConnect'],
				},
				openIdConnectUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				description: {
					type: 'string',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		OAuthFlows: {
			type: 'object',
			properties: {
				implicit: {
					$ref: '#/definitions/ImplicitOAuthFlow',
				},
				password: {
					$ref: '#/definitions/PasswordOAuthFlow',
				},
				clientCredentials: {
					$ref: '#/definitions/ClientCredentialsFlow',
				},
				authorizationCode: {
					$ref: '#/definitions/AuthorizationCodeOAuthFlow',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		ImplicitOAuthFlow: {
			type: 'object',
			required: ['authorizationUrl', 'scopes'],
			properties: {
				authorizationUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				refreshUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				scopes: {
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		PasswordOAuthFlow: {
			type: 'object',
			required: ['tokenUrl'],
			properties: {
				tokenUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				refreshUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				scopes: {
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		ClientCredentialsFlow: {
			type: 'object',
			required: ['tokenUrl'],
			properties: {
				tokenUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				refreshUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				scopes: {
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		AuthorizationCodeOAuthFlow: {
			type: 'object',
			required: ['authorizationUrl', 'tokenUrl'],
			properties: {
				authorizationUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				tokenUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				refreshUrl: {
					type: 'string',
					format: 'uri-reference',
				},
				scopes: {
					type: 'object',
					additionalProperties: {
						type: 'string',
					},
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
		},
		Link: {
			type: 'object',
			properties: {
				operationId: {
					type: 'string',
				},
				operationRef: {
					type: 'string',
					format: 'uri-reference',
				},
				parameters: {
					type: 'object',
					additionalProperties: {},
				},
				requestBody: {},
				description: {
					type: 'string',
				},
				server: {
					$ref: '#/definitions/Server',
				},
			},
			patternProperties: {
				'^x-': {},
			},
			additionalProperties: false,
			not: {
				description: 'Operation Id and Operation Ref are mutually exclusive',
				required: ['operationId', 'operationRef'],
			},
		},
		Callback: {
			type: 'object',
			additionalProperties: {
				$ref: '#/definitions/PathItem',
			},
			patternProperties: {
				'^x-': {},
			},
		},
		Encoding: {
			type: 'object',
			properties: {
				contentType: {
					type: 'string',
				},
				headers: {
					type: 'object',
					additionalProperties: {
						$ref: '#/definitions/Header',
					},
				},
				style: {
					type: 'string',
					enum: ['form', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
				},
				explode: {
					type: 'boolean',
				},
				allowReserved: {
					type: 'boolean',
					default: false,
				},
			},
			additionalProperties: false,
		},
	},
};

/**
 * The Nitric Stack Schema, used for validation of stack files (e.g. nitric.yaml)
 */
export const STACK_SCHEMA: JSONSchema7 = {
	title: 'nitric stack',
	type: 'object',
	properties: {
		name: {
			title: 'project name',
			type: 'string',
			pattern: resourceNamePattern,
		},
		functions: {
			title: 'functions',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'function',
					description: 'A nitric compute func, such as a serverless function',
					type: 'object',
					properties: {
						handler: { type: 'string' },
						context: { type: 'string' },
						triggers: {
							title: 'func triggers',
							type: 'object',
							properties: {
								topics: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
							},
							minProperties: 1,
							additionalProperties: false,
						},
					},
					required: ['handler', 'context'],
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		containers: {
			title: 'containers',
			description: 'custom project containers to build with docker',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'container',
					description: 'A OCI source',
					type: 'object',
					properties: {
						dockerfile: { type: 'string' },
						context: { type: 'string' },
						triggers: {
							title: 'func triggers',
							type: 'object',
							properties: {
								topics: {
									type: 'array',
									items: {
										type: 'string',
									},
								},
							},
							minProperties: 1,
							additionalProperties: false,
						},
					},
					required: ['dockerfile', 'context'],
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		collections: {
			title: 'collections',
			description: 'document collections',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'document collection',
					description: 'A document func collection',
					type: 'object',
					properties: {
						/* currently no properties provided for collections */
					},
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		topics: {
			title: 'topics',
			description: 'topics for async event publishing and subscription',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'topic',
					description: 'A topic for events',
					type: 'object',
					properties: {
						/* currently no properties provided for topics */
					},
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		queues: {
			title: 'queues',
			description: 'queues for batch and pull-based workloads',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'queue',
					description: 'A queue for tasks',
					type: 'object',
					properties: {
						/* currently no properties provided for queues */
					},
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		buckets: {
			title: 'buckets',
			description: 'buckets for blob/file storage',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'bucket',
					description: 'A bucket to store files/blobs',
					type: 'object',
					properties: {
						/* currently no properties provided for buckets */
					},
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		schedules: {
			title: 'schedules',
			description: 'time/cron based schedules to trigger other resources',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'schedule',
					description: 'A schedule, which publishes events based on a CRON expression',
					type: 'object',
					properties: {
						expression: {
							title: 'cron expression for the schedule',
							type: 'string',
							pattern: cronExpressionPattern,
						},
						target: {
							title: 'schedule event target',
							description: 'The target of this schedule where the scheduled event should be sent',
							type: 'object',
							properties: {
								type: {
									type: 'string',
									enum: ['topic'],
								},
								name: { type: 'string' },
							},
							required: ['type', 'name'],
							additionalProperties: false,
						},
						event: {
							title: 'schedule event',
							description: 'the event published by this schedule when the expression is triggered',
							type: 'object',
							properties: {
								payloadType: { type: 'string' },
								payload: {}, // any object
							},
							additionalProperties: false,
						},
					},
					required: ['expression', 'target', 'event'],
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		sites: {
			title: 'static sites',
			description: 'sites for hosting static web content',
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'site',
					description: 'A static site for content',
					type: 'object',
					properties: {
						path: {
							description: 'path of the static site project relative to root of your nitric project',
							type: 'string',
						},
						assetPath: {
							description: 'location of static site assets once site is built relative to path',
							type: 'string',
						},
						buildScripts: {
							description: 'Scripts to run in order to build static site assets',
							type: 'array',
							items: {
								type: 'string',
							},
						},
					},
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		// TODO: Add detailed validation of API Gateway definitions
		apis: {
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					type: 'string',
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
		entrypoints: {
			type: 'object',
			patternProperties: {
				[resourceNamePattern]: {
					title: 'entrypoint',
					description: 'An application entrypoint, representing a URL with a load-balancer and CDN',
					type: 'object',
					properties: {
						paths: {
							title: 'URL context path',
							description:
								'URL context path relative to the base of the entrypoint, used as the target endpoint for other resources',
							type: 'object',
							patternProperties: {
								['^.*$']: {
									title: 'path definition',
									description: 'defines what should happen to requests that reach this entrypoint target',
									type: 'object',
									properties: {
										target: {
											description: 'The name of the target resource that will handle requests to this entrypoint path',
											type: 'string',
											pattern: resourceNamePattern,
										},
										type: {
											description: 'The resource type of the target',
											type: 'string',
											enum: ['site', 'api', 'function', 'container'],
										},
									},
									required: ['target', 'type'],
									additionalProperties: false,
								},
							},
							minProperties: 1,
							additionalProperties: false,
						},
						domains: {
							type: 'array',
							items: {
								type: 'string',
							},
							minItems: 1,
						},
					},
					required: ['paths'],
					additionalProperties: false,
				},
			},
			minProperties: 1,
			additionalProperties: false,
		},
	},
	required: ['name'],
	additionalProperties: false,
};

/**
 * Converts an ajv validation error to a human readable string specific to Nitric Stack Files.
 * @param error to convert
 * @return string the human readable error message.
 */
const stackSchemaErrorToDetails = (error: DefinedError): string => {
	const location = error.instancePath
		.slice(1)
		.split('/')
		.map((name) => {
			// Ajv replaces / with ~1, we need to swap them back.
			return name.split('~1').join('/');
		})
		.join('.');

	switch (error.keyword) {
		case 'additionalProperties':
			if (
				[
					'apis',
					'collections',
					'topics',
					'queues',
					'buckets',
					'schedules',
					'functions',
					'containers',
					'entrypoints',
				].indexOf(location.trim()) !== -1
			) {
				return `Invalid ${location.slice(0, -1)} name "${
					error.params.additionalProperty
				}", names must match the pattern ${resourceNamePattern}`;
			}
			return `Unexpected property "${error.params.additionalProperty}" in ${location}`;
		case 'additionalItems':
			return `Maximum of ${error.params.limit} permitted for ${location}`;
		case 'dependencies':
			return `${error.params.property} is missing ${error.params.missingProperty}, dependencies: ${error.params.deps}, num required: ${error.params.depsCount}, location: ${location}`;
		case 'format':
			return `Expected format ${error.params.format} for ${location}`;
		case 'maximum':
		case 'minimum':
		case 'exclusiveMaximum':
		case 'exclusiveMinimum':
			return `${location} must be ${error.params.comparison} ${error.params.limit}`;
		case 'maxItems':
		case 'maxLength':
		case 'maxProperties':
			return `${location} above maximum of ${error.params.limit}`;
		case 'minItems':
		case 'minLength':
		case 'minProperties':
			return `${location} below minimum of ${error.params.limit}`;
		case 'multipleOf':
			return `${location} must be a multiple of ${error.params.multipleOf}`;
		case 'pattern':
			return `${location} contains an invalid value, expected pattern is ${error.params.pattern}`;
		case 'propertyNames':
			return `${location} has invalid property "${error.params.propertyName}"`;
		case 'required':
			return `${location} is missing required property "${error.params.missingProperty}"`;
	}
	return `${location} is invalid, ${error.message}`;
};

const stackError = (errors: string[] | string): Error => {
	if (typeof errors === 'string') {
		errors = [errors];
	}
	const details = '\n\t' + errors.join('\n\t');
	return new Error(`Invalid nitric stack file.\nDetails:${details}`);
};

/**
 * Validates an object conforms to the nitric stack schema.
 *
 * Returns void if validation is successful, otherwise throws an exception containing validation error details.
 * @param potentialStack the stack to validate.
 */
export const validateStack = (potentialStack: any, filePath: string): void => {
	// Validate Schema Errors
	const schemaValidator = new ajv({
		// schemaId: "auto",
		validateFormats: false,
		coerceTypes: true,
		strict: false,
		useDefaults: true,
		allErrors: true,
	});

	const validate = schemaValidator.compile(STACK_SCHEMA);
	if (!validate(potentialStack)) {
		const errors = (validate.errors as DefinedError[]).map(stackSchemaErrorToDetails);
		throw stackError(errors);
	}

	const pStack: NitricStack = potentialStack as unknown as NitricStack;

	// Validate logical errors (e.g. pointing to names that don't exist, even if they're valid).
	const logicErrors: string[] = [];

	// Validate Func Configurations
	if (pStack.functions) {
		// Validate topic triggers
		Object.entries(pStack.functions).forEach(([funcName, func]: [string, any]) => {
			if (func.triggers && func.triggers.topics) {
				func.triggers.topics.forEach((triggerTopic) => {
					if (!(pStack.topics && pStack.topics[triggerTopic])) {
						logicErrors.push(`Invalid topic trigger for functions.${funcName}, topic "${triggerTopic}" doesn't exist`);
					}
				});
			}
		});
	}

	// Validate Container Configurations
	if (pStack.containers) {
		// Validate topic triggers
		Object.entries(pStack.containers).forEach(([containerName, container]: [string, any]) => {
			if (container.triggers && container.triggers.topics) {
				container.triggers.topics.forEach((triggerTopic) => {
					if (!(pStack.topics && pStack.topics[triggerTopic])) {
						logicErrors.push(
							`Invalid topic trigger for containers.${containerName}, topic "${triggerTopic}" doesn't exist`,
						);
					}
				});
			}
		});
	}

	// Validate Entrypoint Configurations
	if (pStack.entrypoints) {
		Object.entries(pStack.entrypoints).forEach(([entrypointName, entrypoint]: [string, any]) => {
			Object.entries(entrypoint.paths).forEach(([pathName, path]: [string, any]) => {
				if (!(pStack[`${path.type}s`] && pStack[`${path.type}s`][path.target])) {
					logicErrors.push(
						`Invalid target for entrypoints.${entrypointName}.${pathName}, target ${path.type} "${path.target}" doesn't exist`,
					);
				}
			});
		});
	}

	// Validate Schedule Configurations
	if (pStack.schedules) {
		Object.entries(pStack.schedules).forEach(([scheduleName, schedule]: [string, any]) => {
			const target = schedule.target;
			if (!(pStack[`${target.type}s`] && pStack[`${target.type}s`][target.name])) {
				logicErrors.push(
					`Invalid target for schedules.${scheduleName}, target ${target.type} "${target.name}" doesn't exist`,
				);
			}
		});
	}

	// Validate API Gateway Configurations
	if (pStack.apis) {
		Object.entries(pStack.apis).forEach(([apiName, api]: [string, string]) => {
			// see if the file exists...
			const file = path.join(filePath, api);

			if (!fs.existsSync(file)) {
				logicErrors.push(`API file ${api} does not exist relative to ${filePath}`);
			} else {
				// Load and validate the files contents
				const contents = fs.readFileSync(file);
				const api = YAML.parse(contents.toString()) as StackAPIDocument;

				const validate = schemaValidator.compile(OPENAPI_3_SCHEMA);

				if (!validate(api)) {
					logicErrors.push(`${apiName} at ${api} is not a valid Open API 3.0 document`);
				}

				Object.entries(api.paths).forEach(([pathName, path]: [string, any]) => {
					Object.entries(path).forEach(([opName, op]: [string, any]) => {
						if (!/^(get|put|post|delete|options|head|patch|trace)$/.test(opName)) {
							// skip properties that aren't http operations.
							return;
						}
						const target = op['x-nitric-target'];
						if (!(potentialStack[`${target.type}s`] && potentialStack[`${target.type}s`][target.name])) {
							logicErrors.push(
								`Invalid target for apis.${apiName}.${pathName}.${opName}, target ${target.type} "${target.name}" doesn't exist`,
							);
						}
					});
				});
			}
		});
	}

	if (logicErrors.length > 0) {
		throw stackError(logicErrors);
	}
};

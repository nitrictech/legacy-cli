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

import { validateStack } from './schema';

const belowMinimumResourceTest = (resource: string): void => {
	describe(`And ${resource} doesn't contain a ${resource.slice(0, -1)}`, () => {
		const belowMin = {
			name: 'below-minimum-stack',
			[resource]: {}, // if the heading is defined, at least one topic is needed.
		};

		describe('When calling validateStack', () => {
			it('Should fail with below minimum error', () => {
				expect(() => validateStack(belowMin, '.')).toThrow(`${resource} below minimum of 1`);
			});
		});
	});
};

const invalidResourceNameTest = (resource: string): void => {
	describe(`And ${resource} contains a ${resource.slice(0, -1)} with an invalid name`, () => {
		const belowMin = {
			name: 'below-minimum-stack',
			[resource]: {
				'invalid-name!!': {},
			},
		};

		describe('When calling validateStack', () => {
			it('Should fail with invalid name error', () => {
				// Invalid collection name "invalid-name!!"
				expect(() => validateStack(belowMin, '.')).toThrow(`Invalid ${resource.slice(0, -1)} name "invalid-name!!"`);
			});
		});
	});
};

describe('validateSchema', () => {
	describe('Given a stack with a valid stack name', () => {
		const validNameStack = {
			name: 'valid-name',
		};

		// A set of basic validation tests that apply to all top level stack resources.
		describe('Standard Resource Tests', () => {
			// TODO: Add "apis" to the resource list once they're fully validated.
			const resourceNames = ['functions', 'containers', 'topics', 'queues', 'entrypoints', 'buckets', 'collections'];
			resourceNames.forEach((resourceName) => {
				belowMinimumResourceTest(resourceName);
				invalidResourceNameTest(resourceName);
			});
		});

		describe('And a valid func is defined', () => {
			const validWithFunction = {
				...validNameStack,
				functions: {
					thefunction: {
						handler: 'thepath',
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should succeed', () => {
					expect(() => validateStack(validWithFunction, '.')).not.toThrow();
				});
			});
		});

		describe('And a func is defined with an invalid trigger type', () => {
			const stackWithFunctionWithInvalidTrigger = {
				...validNameStack,
				functions: {
					thefunction: {
						handler: 'thepath',
						triggers: {
							topictypo: [
								// misspelled trigger property
								'a-valid-topic',
							],
						},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with invalid property error', () => {
					expect(() => validateStack(stackWithFunctionWithInvalidTrigger, '.')).toThrow(
						'Unexpected property "topictypo" in functions.thefunction.triggers',
					);
				});
			});
		});

		describe('And a func is defined with extra properties', () => {
			const invalidWithExtraProps = {
				...validNameStack,
				functions: {
					'a-function': {
						handler: 'thepath',
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in functions.a-func',
					);
				});
			});
		});

		describe("And a func is defined with a topic trigger for a topic that doesn't exist", () => {
			const stackWithFunctionWithInvalidTrigger = {
				...validNameStack,
				functions: {
					thefunction: {
						handler: 'thepath',
						triggers: {
							topics: [
								// misspelled trigger property
								'not-exist-topic',
							],
						},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail topic not exist error', () => {
					expect(() => validateStack(stackWithFunctionWithInvalidTrigger, '.')).toThrow(
						'Invalid topic trigger for functions.thefunction, topic "not-exist-topic" doesn\'t exist',
					);
				});
			});
		});

		describe('And a valid topic is defined', () => {
			const validWithTopic = {
				...validNameStack,
				topics: {
					'a-valid-topic': {},
				},
			};

			describe('When calling validateStack', () => {
				it('Should succeed', () => {
					expect(() => validateStack(validWithTopic, '.')).not.toThrow();
				});
			});

			describe('And a func is defined with below minimum triggers', () => {
				const stackWithFunctionWithEmptyTriggers = {
					...validWithTopic,
					functions: {
						thefunction: {
							handler: 'thepath',
							triggers: {
								/* at least one property should be present here. */
							},
						},
					},
				};

				describe('When calling validateStack', () => {
					it('Should fail with below min error', () => {
						expect(() => validateStack(stackWithFunctionWithEmptyTriggers, '.')).toThrow(
							'functions.thefunction.triggers below minimum of 1',
						);
					});
				});
			});

			describe('And a func is defined with a topic trigger', () => {
				const stackWithFunctionWithTopicTrigger = {
					...validWithTopic,
					functions: {
						thefunction: {
							handler: 'thepath',
							triggers: {
								topics: ['a-valid-topic'],
							},
						},
					},
				};

				describe('When calling validateStack', () => {
					it('Should succeed', () => {
						expect(() => validateStack(stackWithFunctionWithTopicTrigger, '.')).not.toThrow();
					});
				});
			});
		});

		describe('And a topic is defined with extra properties', () => {
			const invalidWithTopicWithExtraProps = {
				...validNameStack,
				topics: {
					'a-topic': {
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithTopicWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in topics.a-topic',
					);
				});
			});
		});

		describe('And a bucket is defined with extra properties', () => {
			const invalidWithBucketWithExtraProps = {
				...validNameStack,
				buckets: {
					'a-bucket': {
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithBucketWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in buckets.a-bucket',
					);
				});
			});
		});

		describe('And a collection is defined with extra properties', () => {
			const invalidWithExtraProps = {
				...validNameStack,
				collections: {
					'a-collection': {
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in collections.a-collection',
					);
				});
			});
		});

		describe('And a queue is defined with extra properties', () => {
			const invalidWithExtraProps = {
				...validNameStack,
				queues: {
					'a-queue': {
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in queues.a-queue',
					);
				});
			});
		});

		describe('And an entrypoint is defined with extra properties', () => {
			const invalidWithExtraProps = {
				...validNameStack,
				entrypoints: {
					main: {
						paths: {
							'/': {
								target: 'app',
								type: 'site',
							},
						},
						extra: {},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidWithExtraProps, '.')).toThrow(
						'Unexpected property "extra" in entrypoints.main',
					);
				});
			});
		});

		describe("And an entrypoint is defined with targets that don't exist", () => {
			const invalidEntrypointTargets = {
				...validNameStack,
				entrypoints: {
					main: {
						paths: {
							'/': {
								target: 'invalid-site',
								type: 'site',
							},
							'/api': {
								target: 'invalid-api',
								type: 'api',
							},
							'/function': {
								target: 'invalid-func',
								type: 'function',
							},
						},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with site not found', () => {
					expect(() => validateStack(invalidEntrypointTargets, '.')).toThrow(
						'Invalid target for entrypoints.main./, target site "invalid-site" doesn\'t exist',
					);
				});

				it('Should fail with api not found', () => {
					expect(() => validateStack(invalidEntrypointTargets, '.')).toThrow(
						'Invalid target for entrypoints.main./api, target api "invalid-api" doesn\'t exist',
					);
				});

				it('Should fail with func not found', () => {
					expect(() => validateStack(invalidEntrypointTargets, '.')).toThrow(
						'Invalid target for entrypoints.main./function, target function "invalid-func" doesn\'t exist',
					);
				});
			});
		});

		describe("And a schedule is defined with a target that doesn't exist", () => {
			const invalidScheduleTarget = {
				...validNameStack,
				schedules: {
					nightly: {
						expression: '*/5 * * * *',
						target: {
							type: 'topic',
							name: 'invalid-topic',
						},
						event: {
							payload: {
								example: 'payload',
							},
						},
					},
				},
			};

			describe('When calling validateStack', () => {
				it('Should fail with site not found', () => {
					expect(() => validateStack(invalidScheduleTarget, '.')).toThrow(
						'Invalid target for schedules.nightly, target topic "invalid-topic" doesn\'t exist',
					);
				});
			});
		});

		describe('And an invalid resource name is present', () => {
			const invalidResourceStack = {
				...validNameStack,
				invalidResource: {},
			};

			describe('When calling validateStack', () => {
				it('Should fail with unexpected property error', () => {
					expect(() => validateStack(invalidResourceStack, '.')).toThrow('Unexpected property "invalidResource"');
				});
			});
		});
	});

	describe('Given a stack with an invalid stack name', () => {
		const validNameStack = {
			name: 'invalid-name!',
		};

		describe('When calling validateStack', () => {
			it('Should fail with invalid value error', () => {
				expect(() => validateStack(validNameStack, '.')).toThrow('name contains an invalid value');
			});
		});
	});
});

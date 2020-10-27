import AWS from 'aws-sdk';
import { Down } from '../src/tasks/down';

describe('nitric down:aws tests', () => {
	describe('Given a call to describeStacks.promise() rejects', () => {
		beforeAll(() => {
			const awsMock = jest.spyOn(AWS, 'CloudFormation');
			awsMock.mockImplementation(() => {
				return {
					describeStacks: () => ({
						promise: (): Promise<any> => Promise.reject(),
					}),
				} as any;
			});
		});

		afterAll(() => {
			jest.clearAllMocks();
		});

		test('Then down command should throw an error', () => {
			expect(
				async () =>
					await new Down({
						region: 'test',
						stackName: 'test',
						stack: {
							name: 'test',
						},
					}).do(),
			).rejects.toThrowError();
		});
	});
});

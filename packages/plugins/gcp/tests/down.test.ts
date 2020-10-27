import { Down } from '../src/tasks/down';
import { deploymentmanager_v2beta, google } from 'googleapis';

describe('nitric down:gcp tests', () => {
	describe('Given a call to DeploymentManager.delete() rejects', () => {
		beforeAll(() => {
			const authMock = jest.spyOn(google.auth, 'GoogleAuth');
			authMock.mockImplementation(
				() =>
					({
						getClient: () => ({} as any),
					} as any),
			);

			const gcpMock = jest.spyOn(deploymentmanager_v2beta, 'Deploymentmanager');
			gcpMock.mockImplementation(() => {
				return {
					deployments: {
						delete: (): Promise<any> => Promise.reject(),
					},
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
						gcpProject: 'mock-project',
						stackName: 'test',
						keepResources: false,
					}).do(),
			).rejects.toThrowError();
		});
	});
});

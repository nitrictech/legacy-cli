import 'jest';
import { mocked } from 'ts-jest/utils';
import { CreateNetworkTask } from '../../../src/tasks/run';
import Docker from 'dockerode';

jest.mock('dockerode');

describe('Given a docker network is needed to run the app', () => {
	afterAll(() => {
		jest.resetAllMocks();
	});

	test('Create docker volume should be called', async () => {
		expect.assertions(1);
		await new CreateNetworkTask({ name: 'test-network-name' }).do();

		const mockInstance = mocked(Docker, true).mock.instances[0];
		expect(mockInstance.createNetwork).toBeCalledWith({
			Name: 'test-network-name',
		});
	});
});

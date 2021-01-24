import 'jest';
import { mocked } from 'ts-jest/utils';
import { CreateVolumeTask } from '.';
import Docker from 'dockerode';

jest.mock('dockerode');

describe('Given a docker volume is needed to run the app', () => {
	afterAll(() => {
		jest.resetAllMocks();
	});

	test('Create docker volume should be called', async () => {
		expect.assertions(1);
		await new CreateVolumeTask({ volumeName: 'test-volume-name' }).do();

		const mockInstance = mocked(Docker, true).mock.instances[0];
		expect(mockInstance.createVolume).toBeCalledWith({
			Name: 'test-volume-name',
		});
	});
});

import { Down } from '../src/tasks/down';
import { LocalWorkspace } from '@pulumi/pulumi/x/automation';

describe('nitric down:gcp tests', () => {
	describe('Given a call to LocalWorkspace.selectStack rejects', () => {
		beforeAll(() => {
			const selectStackMock = jest.spyOn(LocalWorkspace, 'selectStack');
			selectStackMock.mockImplementation(async () => {
				// TODO: Mock genuine error for missing stack
				throw new Error('Some error occurred');
			});
		});

		afterAll(() => {
			jest.clearAllMocks();
		});

		test('Then down command should throw an error', () => {
			expect(
				async () =>
					await new Down({
						stackName: 'test',
					}).do(),
			).rejects.toThrowError();
		});
	});
});

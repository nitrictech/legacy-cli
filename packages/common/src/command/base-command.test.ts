import { BaseCommand } from "./base-command";
import { Preferences } from "../preferences";
import { AnalyticsClient } from "../analytics";
import { CommandClient } from "../analytics/command-client";
import { Config } from "../config";

jest.mock('universal-analytics');
jest.mock("../analytics/command-client");

const MockedCommandClient = (CommandClient as unknown) as jest.Mock<typeof CommandClient.prototype>;

class MockCommand extends BaseCommand {

	static hasRun = false; 
	static shouldError = false;

	async do(): Promise<void> {
		MockCommand.hasRun = true;

		if (MockCommand.shouldError) {
			throw new Error();      
		}
	}
}

const NO_OP = async (): Promise<void> => {
	// NO_OP
};

/**
 * Setup spy instances
 */
let preferencesRequiresInitSpy: jest.SpyInstance;
let preferencesInitWorkflowSpy: jest.SpyInstance;
let analyticsFromDefaultSpy: jest.SpyInstance;
let analyticsCommandSpy: jest.SpyInstance;

beforeAll(() => {
	preferencesRequiresInitSpy = jest.spyOn(Preferences, "requiresInit").mockReturnValue(false);
	jest.spyOn(Preferences, "fromDefault").mockResolvedValue(new Preferences({
		clientId: "test",
		analyticsEnabled: false,
	}));
	preferencesInitWorkflowSpy = jest.spyOn(Preferences, "initWorkflow").mockImplementation(NO_OP);
	analyticsFromDefaultSpy = jest.spyOn(AnalyticsClient, "defaultAnalyticsClient");
	analyticsCommandSpy = jest.spyOn(AnalyticsClient.prototype, "command");
	
});

afterAll(() => {
	jest.clearAllMocks();
});

// Test a vanilla successful test run
describe('successful first run', () => {
	beforeAll(async () => {
		await MockCommand.run([]);
	});

	afterAll(() => {
		MockCommand.hasRun = false;
		jest.resetAllMocks();
	});

	it('should check if preferences require initialization', () => {
		expect(preferencesRequiresInitSpy).toBeCalled();
	});

	it('should invoke the preferences initialization workflow', () => {
		expect(preferencesInitWorkflowSpy).toBeCalled();
	});

	it('should create the default analytics client', () => {
		expect(analyticsFromDefaultSpy).toBeCalled();
	});

	it('should create a new analytics command with the commands constructor name', () => {
		expect(analyticsCommandSpy).toBeCalled();
		expect(analyticsCommandSpy).toBeCalledWith("MockCommand");
	});

	it('should start the created command client', () => {
		expect(MockedCommandClient.mock.instances[0].start).toHaveBeenCalled();
	});

	it('should not call the analytics command error', () => {
		expect(MockedCommandClient.mock.instances[0].error).toHaveBeenCalledTimes(0);
	});

	it('should stop the created command client', () => {
		expect(MockedCommandClient.mock.instances[0].stop).toHaveBeenCalled();
	});

	it('should respect the provided ci flag', () => {
		expect(Config.get().ciMode).toBe(false);
	});

	it('should run the command.do', () => {
		expect(MockCommand.hasRun).toBe(true);
	});
});

// Test universal CI --ci flag setting
// for disabling interactivity
describe('ci run', () => {
	beforeAll(async () => {
		await MockCommand.run(['--ci']);
	});

	afterAll(() => {
		MockCommand.hasRun = false;
		jest.resetAllMocks();
	});

	it('should respect the provided ci flag', () => {
		expect(Config.get().ciMode).toBe(true);
	});
});

// Ensure errors are reported to google analytics
describe('error run', () => {
	beforeAll(async () => {
		MockCommand.shouldError = true;
		await MockCommand.run(['--ci']);
	});

	afterAll(() => {
		MockCommand.shouldError = false;
		MockCommand.hasRun = false;
		jest.resetAllMocks();
	})

	it('should start the created command client', () => {
		expect(MockedCommandClient.mock.instances[0].start).toHaveBeenCalled();
	});

	it('should call the analytics command error', () => {
		expect(MockedCommandClient.mock.instances[0].error).toHaveBeenCalled();
	});

	it('should stop the created command client', () => {
		expect(MockedCommandClient.mock.instances[0].stop).toHaveBeenCalled();
	});
});
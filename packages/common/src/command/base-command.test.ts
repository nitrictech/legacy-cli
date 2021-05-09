import { BaseCommand } from "./base-command";
import { Preferences } from "../preferences";
import { AnalyticsClient } from "../analytics";
import { CommandClient } from "../analytics/command-client";

jest.mock('universal-analytics');
jest.mock("../analytics/command-client");

const MockedCommandClient = (CommandClient as unknown) as jest.Mock<typeof CommandClient.prototype>;

/**
 * 
 */
class MockCommand extends BaseCommand {

	static hasRun = false; 

	async do(): Promise<void> {
		MockCommand.hasRun = true;
	}
}

const NO_OP = async (): Promise<void> => {
	// NO_OP
};

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

describe('successful first run', () => {
	beforeAll(async () => {
		await MockCommand.run([]);
	});

	afterAll(() => {
		MockCommand.hasRun = false;
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

	it('should stop the created command client', () => {
		expect(MockedCommandClient.mock.instances[0].stop).toHaveBeenCalled();
	});

	it('should run the command.do', () => {
		expect(MockCommand.hasRun).toBe(true);
	});
});

//describe('error run', () => {
//	beforeAll(() => {

//	});

//	it('should start the created command client', () => {

//	});

//	it('should error the command client', () => {

//	});

//	it('should stop the created command client', () => {

//	});
//});
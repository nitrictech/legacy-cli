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
import { Visitor } from 'universal-analytics';
import { CommandClient } from './command-client';

jest.mock('universal-analytics');

const MockedVisitor = (Visitor as unknown) as jest.Mock<typeof Visitor.prototype>;

const mockedVisitor = new MockedVisitor();
const mockCommandClient = new CommandClient("mock", mockedVisitor);

beforeAll(() => {
	jest.spyOn(mockedVisitor, 'send').mockImplementation((callback: any) => {
		callback();
	});
	jest.spyOn(mockedVisitor, "timing").mockImplementation(() => {
		return mockedVisitor;
	});
});

afterAll(() => {
	jest.restoreAllMocks();
	jest.resetModules();
});

describe("CommandClient", () => {
	describe('start', () => {

		beforeAll(() => {
			mockCommandClient.start();
		});
	
		afterAll(() => {
			// Clear the start time
			Object.assign(mockCommandClient, { startTime: undefined })
			jest.clearAllMocks();
			
		});
	
		it('should create a new GA page view', () => {
			expect(mockedVisitor.pageview).toHaveBeenCalled();
			expect(mockedVisitor.pageview).toHaveBeenCalledWith("mock", 'CLI');
		});
	
		it('should raise a new GA event', () => {
			expect(mockedVisitor.event).toHaveBeenCalled();
			expect(mockedVisitor.event).toHaveBeenCalledWith("mock", 'start');
		});
	});
	
	describe('error', () => {
		const error = new Error('test');
		beforeAll(() => {
			mockCommandClient.error(error, false);
		});
	
		afterAll(() => {
			jest.clearAllMocks();
		});
	
		it('should raise a new GA exception', () => {
			expect(mockedVisitor.exception).toHaveBeenCalled();
			expect(mockedVisitor.exception).toHaveBeenCalledWith((error.stack || error.message), false);
		});
	});
	
	describe('before start', () => {
		afterAll(() => {
			jest.clearAllMocks();
		});
	
		it('should throw an exception', async () => {
			await expect(async () => { 
				await mockCommandClient.stop();
			}).rejects.toThrow('Command client stopped without being started');
		});
	});
	
	describe('stop after start', () => {
		beforeAll(async () => {
			mockCommandClient.start();
			await mockCommandClient.stop();
		});
	
		afterAll(() => {
			jest.clearAllMocks();
		});
	
		it('should raise a stop event', () => {
			expect(mockedVisitor.event).toHaveBeenCalledTimes(2);
			expect(mockedVisitor.event).toHaveBeenLastCalledWith("mock", 'stop');
		});
	
		it('should raise a timing event', () => {
			expect(mockedVisitor.timing).toHaveBeenCalled();
			expect(mockedVisitor.timing).toHaveBeenCalledWith('mock', 'runtime', expect.any(Number));
		});
	
		it('should flush queued events', () => {
			expect(mockedVisitor.send).toHaveBeenCalled();
		});
	});
});


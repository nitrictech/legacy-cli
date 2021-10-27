import { cronToAwsCron } from './schedule';

describe('Cron Expression Conversion', () => {
	describe('Given an expression with more than 5 values', () => {
		const exp = '*/1 * * * ? *';

		it('Should throw an error', () => {
			expect(() => {
				cronToAwsCron(exp);
			}).toThrow();
		});
	});

	describe('Given a valid cron expression', () => {
		const exp = '*/1 * * * *';

		describe('When converting the expression', () => {
			let awsExpValues: string[] = [];
			beforeAll(() => {
				// Expected result = '0/1 * * * ? *'
				awsExpValues = cronToAwsCron(exp).split(' ');
			});

			it('Should replace the * with 0 for "every x unit" style values', () => {
				expect(awsExpValues[0]).toEqual('0/1');
			});

			it('Should replace * in Day of Week with ? if DOW and DOM are both *', () => {
				expect(awsExpValues[4]).toEqual('?');
			});

			it('Should output an expression with year added as a *', () => {
				expect(awsExpValues.length).toEqual(6);
				expect(awsExpValues[5]).toEqual('*');
			});
		});
	});

	describe('Given a valid cron with a Day of Week value between 0-6', () => {
		const exp = '*/1 * * * 3';

		describe('When converting the expression', () => {
			let awsExpValues: string[] = [];
			beforeAll(() => {
				// Expected result = '0/1 * ? * 3 *'
				awsExpValues = cronToAwsCron(exp).split(' ');
			});

			it('increment the value by 1', () => {
				expect(awsExpValues[4]).toEqual('4');
			});

			it('Should replace * in Day of Month with ?', () => {
				expect(awsExpValues[2]).toEqual('?');
			});
		});
	});

	describe('Given a valid cron with a Day of Week value of 7 (Sunday)', () => {
		const exp = '*/1 * * * 7';

		describe('When converting the expression', () => {
			let awsExpValues: string[] = [];
			beforeAll(() => {
				// Expected result = '0/1 * ? * 1 *'
				awsExpValues = cronToAwsCron(exp).split(' ');
			});

			it('Should set the value to 1 (Sunday)', () => {
				expect(awsExpValues[4]).toEqual('1');
			});
		});
	});

	describe('Given a valid cron with a Day of Week value range', () => {
		const exp = '*/1 * * * 1-3';

		describe('When converting the expression', () => {
			let awsExpValues: string[] = [];
			beforeAll(() => {
				// Expected result = '0/1 * ? * 1 *'
				awsExpValues = cronToAwsCron(exp).split(' ');
			});

			it('Should increment both values by 1', () => {
				expect(awsExpValues[4]).toEqual('2-4');
			});
		});
	});
});

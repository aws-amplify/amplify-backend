import { describe, it } from 'node:test';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { convertFunctionSchedulesToRuleSchedules } from './schedule_parser.js';
import { FunctionSchedule } from './factory.js';
import assert from 'node:assert';
import os from 'os';

void describe('ScheduleParser', () => {
  void it('creates EventBridge rule for natural language', () => {
    const schedule: FunctionSchedule[] = ['every day'];
    const expectedScheduleExpression = 'cron(0 0 * * ? *)'; // every day at 00:00
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rule for natural language with number value', () => {
    const schedule: FunctionSchedule[] = ['every 5m'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rule for cron expression', () => {
    const schedule: FunctionSchedule[] = ['* * * * ?'];
    const expectedScheduleExpression = 'cron(* * * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rule for cron expression with /', () => {
    const schedule: FunctionSchedule[] = ['*/5 * * * ?'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rule for cron expression with ,', () => {
    const schedule: FunctionSchedule[] = ['0 1,2 * * ?'];
    const expectedScheduleExpression = 'cron(0 1,2 * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rule for cron expression with -', () => {
    const schedule: FunctionSchedule[] = ['0 1-5 * * ?'];
    const expectedScheduleExpression = 'cron(0 1-5 * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      schedule
    );

    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].expressionString, expectedScheduleExpression);
  });

  void it('creates EventBridge rules for an array of natural language', () => {
    const functionSchedules: FunctionSchedule[] = ['every 2h', 'every month'];
    const expectedExpressionTwoHours = 'cron(0 */2 * * ? *)';
    const expectedExpressionEveryMonth = 'cron(0 0 1 * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      functionSchedules
    );

    assert.equal(schedules.length, 2);
    assert.equal(schedules[0].expressionString, expectedExpressionTwoHours);
    assert.equal(schedules[1].expressionString, expectedExpressionEveryMonth);
  });

  void it('creates EventBridge rules for an array of cron expressions', () => {
    const functionSchedules: FunctionSchedule[] = ['* * * * ?', '0 0 * * ?'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryMidnight = 'cron(0 0 * * ? *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      functionSchedules
    );

    assert.equal(schedules.length, 2);
    assert.equal(schedules[0].expressionString, expectedExpressionEveryMinute);
    assert.equal(
      schedules[1].expressionString,
      expectedExpressionEveryMidnight
    );
  });

  void it('creates EventBridge rules for an array of both natural language and cron expressions', () => {
    const functionSchedules: FunctionSchedule[] = ['* * * * ?', 'every week'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryWeek = 'cron(0 0 ? * 1 *)';
    const testLambda = getTestLambda();

    const schedules = convertFunctionSchedulesToRuleSchedules(
      testLambda,
      functionSchedules
    );

    assert.equal(schedules.length, 2);
    assert.equal(schedules[0].expressionString, expectedExpressionEveryMinute);
    assert.equal(schedules[1].expressionString, expectedExpressionEveryWeek);
  });

  void it('throws if rate is a negative number', () => {
    const schedule: FunctionSchedule[] = ['every -5m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be set with a positive whole number',
      }
    );
  });

  void it('throws if rate is not a whole number', () => {
    const schedule: FunctionSchedule[] = ['every 1.5h'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be set with a positive whole number',
      }
    );
  });

  void it('throws if cron expression fields are outside their allowed values', () => {
    const schedule: FunctionSchedule[] = ['60 25 42 14 9 1500'];
    const testLambda = getTestLambda();
    const expectedErrors = [
      'Cron field for minutes must be a whole number between 0 and 59',
      'Cron field for hours must be a whole number between 0 and 23',
      'Cron field for day-of-month must be a whole number between 1 and 31',
      'Cron field for month must be a whole number between 1 and 12',
      'Cron field for day-of-week must be a whole number between 1 and 7',
      'Cron field for year must be a whole number between 1970 and 2199',
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields',
    ];

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      }
    );
  });

  void it('throws if cron expression fields have invalid list values', () => {
    const schedule: FunctionSchedule[] = [
      '1,60,*/-1 2,25,1-50 1,40 1,13 1,2,8 1970,2200',
    ];
    const testLambda = getTestLambda();
    const expectedErrors = [
      'Cron list for minutes must contain whole numbers between 0 and 59',
      'Cron step values for minutes must be positive whole numbers',
      'Cron list for hours must contain whole numbers between 0 and 23',
      'Cron range for hours must be whole numbers between 0 and 23',
      'Cron list for day-of-month must contain whole numbers between 1 and 31',
      'Cron list for month must contain whole numbers between 1 and 12',
      'Cron list for day-of-week must contain whole numbers between 1 and 7',
      'Cron list for year must contain whole numbers between 1970 and 2199',
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields',
    ];

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      }
    );
  });

  void it('throws if cron expression fields have invalid step values', () => {
    const schedule: FunctionSchedule[] = ['*/-2 */-1 100/1 */.4 */-1 */1.5'];
    const testLambda = getTestLambda();
    const expectedErrors = [
      'Cron step values for minutes must be positive whole numbers',
      'Cron step values for hours must be positive whole numbers',
      'Cron step values for day-of-month must be whole numbers between 1 and 31',
      'Cron step values for month must be positive whole numbers',
      'Cron step values for day-of-week must be positive whole numbers',
      'Cron step values for year must be positive whole numbers',
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields',
    ];

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      }
    );
  });

  void it('throws if cron expression fields have invalid range values', () => {
    const schedule: FunctionSchedule[] = ['1-60 1-25 1-32 1-13 1-90 2000-3000'];
    const testLambda = getTestLambda();
    const expectedErrors = [
      'Cron range for minutes must be whole numbers between 0 and 59',
      'Cron range for hours must be whole numbers between 0 and 23',
      'Cron range for day-of-month must be whole numbers between 1 and 31',
      'Cron range for month must be whole numbers between 1 and 12',
      'Cron range for day-of-week must be whole numbers between 1 and 7',
      'Cron range for year must be whole numbers between 1970 and 2199',
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields',
    ];

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      }
    );
  });

  void it('throws if schedule will invoke function again before timeout', () => {
    const schedule: FunctionSchedule[] = ['every 1m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToRuleSchedules(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be greater than the function timeout of 120 seconds',
      }
    );
  });
});

const getTestLambda = () =>
  new Function(new Stack(new App()), 'testFunction', {
    code: Code.fromInline('test code'),
    runtime: Runtime.NODEJS_20_X,
    handler: 'handler',
    timeout: Duration.seconds(120), // 2 minutes
  });

import { describe, it } from 'node:test';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { convertFunctionSchedulesToScheduleProps } from './schedule_parser.js';
import { CronSchedule, FunctionSchedule } from './factory.js';
import assert from 'node:assert';
import os from 'os';

void describe('ScheduleParser', () => {
  void it('creates EventBridge Schedule props for natural language', () => {
    const schedule: FunctionSchedule[] = ['every day'];
    const expectedScheduleExpression = 'cron(0 0 * * ? *)'; // every day at 00:00
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for natural language with timezone', () => {
    const schedule: FunctionSchedule[] = [
      { rate: 'every day', timezone: 'America/New_York' },
    ];
    const expectedScheduleExpression = 'cron(0 0 * * ? *)'; // every day at 00:00
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(
      scheduleProps[0].schedule.timeZone?.timezoneName,
      'America/New_York',
    );
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for natural language with description', () => {
    const schedule: FunctionSchedule[] = [
      { rate: 'every day', timezone: 'UTC', description: 'Daily task' },
    ];
    const expectedScheduleExpression = 'cron(0 0 * * ? *)'; // every day at 00:00
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, 'Daily task');
  });

  void it('creates EventBridge Schedule props for natural language with number value', () => {
    const schedule: FunctionSchedule[] = ['every 5m'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for cron expression', () => {
    const schedule: FunctionSchedule[] = ['* * * * ?'];
    const expectedScheduleExpression = 'cron(* * * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for cron expression with timezone', () => {
    const schedule: FunctionSchedule[] = [
      { cron: '* * * * ?', timezone: 'America/New_York' },
    ];
    const expectedScheduleExpression = 'cron(* * * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(
      scheduleProps[0].schedule.timeZone?.timezoneName,
      'America/New_York',
    );
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for cron expression with description', () => {
    const schedule: FunctionSchedule[] = [
      {
        cron: '* * * * ?',
        timezone: 'America/New_York',
        description: 'Every minute',
      },
    ];
    const expectedScheduleExpression = 'cron(* * * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(
      scheduleProps[0].schedule.timeZone?.timezoneName,
      'America/New_York',
    );
    assert.equal(scheduleProps[0].description, 'Every minute');
  });

  void it('creates EventBridge Schedule props for cron expression with /', () => {
    const schedule: FunctionSchedule[] = ['*/5 * * * ?'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for cron expression with ,', () => {
    const schedule: FunctionSchedule[] = ['0 1,2 * * ?'];
    const expectedScheduleExpression = 'cron(0 1,2 * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for cron expression with -', () => {
    const schedule: FunctionSchedule[] = ['0 1-5 * * ?'];
    const expectedScheduleExpression = 'cron(0 1-5 * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      schedule,
    );

    assert.equal(scheduleProps.length, 1);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedScheduleExpression,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
  });

  void it('creates EventBridge Schedule props for an array of natural language', () => {
    const functionSchedules: FunctionSchedule[] = ['every 2h', 'every month'];
    const expectedExpressionTwoHours = 'cron(0 */2 * * ? *)';
    const expectedExpressionEveryMonth = 'cron(0 0 1 * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      functionSchedules,
    );

    assert.equal(scheduleProps.length, 2);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedExpressionTwoHours,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
    assert.equal(
      scheduleProps[1].schedule.expressionString,
      expectedExpressionEveryMonth,
    );
    assert.equal(scheduleProps[1].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[1].description, undefined);
  });

  void it('creates EventBridge Schedule props for an array of cron expressions', () => {
    const functionSchedules: FunctionSchedule[] = ['* * * * ?', '0 0 * * ?'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryMidnight = 'cron(0 0 * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      functionSchedules,
    );

    assert.equal(scheduleProps.length, 2);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedExpressionEveryMinute,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
    assert.equal(
      scheduleProps[1].schedule.expressionString,
      expectedExpressionEveryMidnight,
    );
    assert.equal(scheduleProps[1].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[1].description, undefined);
  });

  void it('creates EventBridge Schedule props for an array of both natural language and cron expressions', () => {
    const functionSchedules: FunctionSchedule[] = ['* * * * ?', 'every week'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryWeek = 'cron(0 0 ? * 1 *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      functionSchedules,
    );

    assert.equal(scheduleProps.length, 2);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedExpressionEveryMinute,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
    assert.equal(
      scheduleProps[1].schedule.expressionString,
      expectedExpressionEveryWeek,
    );
    assert.equal(scheduleProps[1].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[1].description, undefined);
  });

  void it('creates EventBridge Schedule props for an array of both expression with timezone and cron expression without timezone', () => {
    const functionSchedules: FunctionSchedule[] = [
      '* * * * ?',
      { cron: '0 0 * * ?', timezone: 'Asia/Tokyo' },
    ];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryMidnight = 'cron(0 0 * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      functionSchedules,
    );

    assert.equal(scheduleProps.length, 2);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedExpressionEveryMinute,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, undefined);
    assert.equal(
      scheduleProps[1].schedule.expressionString,
      expectedExpressionEveryMidnight,
    );
    assert.equal(
      scheduleProps[1].schedule.timeZone?.timezoneName,
      'Asia/Tokyo',
    );
    assert.equal(scheduleProps[1].description, undefined);
  });

  void it('creates EventBridge Schedule props for an array with descriptions', () => {
    const functionSchedules: FunctionSchedule[] = [
      { rate: 'every 2h', timezone: 'UTC', description: 'Hourly sync' },
      { cron: '0 0 * * ?', timezone: 'UTC', description: 'Daily cleanup' },
    ];
    const expectedExpressionTwoHours = 'cron(0 */2 * * ? *)';
    const expectedExpressionEveryMidnight = 'cron(0 0 * * ? *)';
    const testLambda = getTestLambda();

    const scheduleProps = convertFunctionSchedulesToScheduleProps(
      testLambda,
      functionSchedules,
    );

    assert.equal(scheduleProps.length, 2);
    assert.equal(
      scheduleProps[0].schedule.expressionString,
      expectedExpressionTwoHours,
    );
    assert.equal(scheduleProps[0].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[0].description, 'Hourly sync');
    assert.equal(
      scheduleProps[1].schedule.expressionString,
      expectedExpressionEveryMidnight,
    );
    assert.equal(scheduleProps[1].schedule.timeZone?.timezoneName, 'UTC');
    assert.equal(scheduleProps[1].description, 'Daily cleanup');
  });

  void it('throws if rate is a negative number', () => {
    const schedule: FunctionSchedule[] = ['every -5m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be set with a positive whole number',
      },
    );
  });

  void it('throws if rate is not a whole number', () => {
    const schedule: FunctionSchedule[] = ['every 1.5h'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be set with a positive whole number',
      },
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
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      },
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
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      },
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
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      },
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
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message: expectedErrors.join(os.EOL),
      },
    );
  });

  void it('throws if schedule will invoke function again before timeout', () => {
    const schedule: FunctionSchedule[] = ['every 1m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message:
          'Function schedule rate must be greater than the function timeout of 120 seconds',
      },
    );
  });

  void it('throws if schedule is an invalid format', () => {
    // eslint-disable-next-line spellcheck/spell-checker -- misspelled to test error handling
    const schedule: FunctionSchedule[] = [
      { corn: '* * * * *', timezone: 'UTC' } as unknown as CronSchedule,
    ];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        convertFunctionSchedulesToScheduleProps(testLambda, schedule);
      },
      {
        message: "Could not determine the function's schedule type",
      },
    );
  });
});

const getTestLambda = () =>
  new Function(new Stack(new App()), 'testFunction', {
    code: Code.fromInline('test code'),
    runtime: Runtime.NODEJS_22_X,
    handler: 'handler',
    timeout: Duration.seconds(120), // 2 minutes
  });

import { describe, it } from 'node:test';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ScheduleParser } from './schedule_parser.js';
import { TimeInterval } from './factory.js';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';

void describe('ScheduleParser', () => {
  void it('creates EventBridge rule for natural language', () => {
    const timeInterval: TimeInterval[] = ['every day'];
    const expectedScheduleExpression = 'cron(0 0 * * ? *)'; // every day at 00:00
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rule for natural language with number value', () => {
    const timeInterval: TimeInterval[] = ['every 5m'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rule for cron expression', () => {
    const timeInterval: TimeInterval[] = ['* * * * *'];
    const expectedScheduleExpression = 'cron(* * * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rule for cron expression with /', () => {
    const timeInterval: TimeInterval[] = ['*/5 * * * *'];
    const expectedScheduleExpression = 'cron(*/5 * * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rule for cron expression with ,', () => {
    const timeInterval: TimeInterval[] = ['0 1,2 * * *'];
    const expectedScheduleExpression = 'cron(0 1,2 * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rule for cron expression with -', () => {
    const timeInterval: TimeInterval[] = ['0 1-5 * * *'];
    const expectedScheduleExpression = 'cron(0 1-5 * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeInterval);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedScheduleExpression,
    });
  });

  void it('creates EventBridge rules for an array of natural language', () => {
    const timeIntervals: TimeInterval[] = ['every 2h', 'every month'];
    const expectedExpressionFiveMinutes = 'cron(0 */2 * * ? *)';
    const expectedExpressionEveryMonth = 'cron(0 0 1 * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeIntervals);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 2);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionFiveMinutes,
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionEveryMonth,
    });
  });

  void it('creates EventBridge rules for an array of cron expressions', () => {
    const timeIntervals: TimeInterval[] = ['* * * * *', '0 0 * * *'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryMidnight = 'cron(0 0 * * ? *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeIntervals);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 2);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionEveryMinute,
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionEveryMidnight,
    });
  });

  void it('creates EventBridge rules for an array of both natural language and cron expressions', () => {
    const timeIntervals: TimeInterval[] = ['* * * * *', 'every week'];
    const expectedExpressionEveryMinute = 'cron(* * * * ? *)';
    const expectedExpressionEveryWeek = 'cron(0 0 ? * 1 *)';
    const testLambda = getTestLambda();

    new ScheduleParser(testLambda, timeIntervals);

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Events::Rule', 2);
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionEveryMinute,
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: expectedExpressionEveryWeek,
    });
  });

  void it('throws if rate is a negative number', () => {
    const timeInterval: TimeInterval[] = ['every -5m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        new ScheduleParser(testLambda, timeInterval);
      },
      {
        message: `schedule must be set with a positive whole number`,
      }
    );
  });

  void it('throws if rate is not a whole number', () => {
    const timeInterval: TimeInterval[] = ['every 1.5h'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        new ScheduleParser(testLambda, timeInterval);
      },
      {
        message: `schedule must be set with a positive whole number`,
      }
    );
  });

  void it('throws if cron expression is not valid', () => {
    // fails since allowed values for minutes is 0-59
    const timeInterval: TimeInterval[] = ['60 * * * *'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        new ScheduleParser(testLambda, timeInterval);
      },
      {
        message: `schedule cron expression is not valid`,
      }
    );
  });

  void it('throws if schedule will invoke function before timeout', () => {
    const timeInterval: TimeInterval[] = ['every 1m'];
    const testLambda = getTestLambda();

    assert.throws(
      () => {
        new ScheduleParser(testLambda, timeInterval);
      },
      {
        message: `schedule must be greater than the timeout of 2 minutes`,
      }
    );
  });
});

const getTestLambda = () =>
  new Function(new Stack(new App()), 'testFunction', {
    code: Code.fromInline('test code'),
    runtime: Runtime.NODEJS_20_X,
    handler: 'handler',
    timeout: Duration.minutes(2),
  });

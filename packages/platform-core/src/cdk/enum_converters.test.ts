import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LogLevel, LogRetention } from '@aws-amplify/plugin-types';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { LogLevelConverter, LogRetentionConverter } from './enum_converters';
import { ApplicationLogLevel } from 'aws-cdk-lib/aws-lambda';

type TestCase<TSource, TTarget> = {
  input: TSource | undefined;
  expectedOutput: TTarget | undefined;
};

void describe('LogRetentionConverter', () => {
  const testCases: Array<TestCase<LogRetention, RetentionDays>> = [
    {
      input: undefined,
      expectedOutput: undefined,
    },
    {
      input: '1 day',
      expectedOutput: RetentionDays.ONE_DAY,
    },
    {
      input: '3 days',
      expectedOutput: RetentionDays.THREE_DAYS,
    },
    {
      input: '5 days',
      expectedOutput: RetentionDays.FIVE_DAYS,
    },
    {
      input: '1 week',
      expectedOutput: RetentionDays.ONE_WEEK,
    },
    {
      input: '2 weeks',
      expectedOutput: RetentionDays.TWO_WEEKS,
    },
    {
      input: '1 month',
      expectedOutput: RetentionDays.ONE_MONTH,
    },
    {
      input: '2 months',
      expectedOutput: RetentionDays.TWO_MONTHS,
    },
    {
      input: '3 months',
      expectedOutput: RetentionDays.THREE_MONTHS,
    },
    {
      input: '4 months',
      expectedOutput: RetentionDays.FOUR_MONTHS,
    },
    {
      input: '5 months',
      expectedOutput: RetentionDays.FIVE_MONTHS,
    },
    {
      input: '6 months',
      expectedOutput: RetentionDays.SIX_MONTHS,
    },
    {
      input: '13 months',
      expectedOutput: RetentionDays.THIRTEEN_MONTHS,
    },
    {
      input: '18 months',
      expectedOutput: RetentionDays.EIGHTEEN_MONTHS,
    },
    {
      input: '1 year',
      expectedOutput: RetentionDays.ONE_YEAR,
    },
    {
      input: '2 years',
      expectedOutput: RetentionDays.TWO_YEARS,
    },
    {
      input: '3 years',
      expectedOutput: RetentionDays.THREE_YEARS,
    },
    {
      input: '5 years',
      expectedOutput: RetentionDays.FIVE_YEARS,
    },
    {
      input: '6 years',
      expectedOutput: RetentionDays.SIX_YEARS,
    },
    {
      input: '7 years',
      expectedOutput: RetentionDays.SEVEN_YEARS,
    },
    {
      input: '8 years',
      expectedOutput: RetentionDays.EIGHT_YEARS,
    },
    {
      input: '9 years',
      expectedOutput: RetentionDays.NINE_YEARS,
    },
    {
      input: '10 years',
      expectedOutput: RetentionDays.TEN_YEARS,
    },
    {
      input: 'infinite',
      expectedOutput: RetentionDays.INFINITE,
    },
  ];

  testCases.forEach((testCase, index) => {
    void it(`converts log retention[${index}]`, () => {
      const convertedValue = new LogRetentionConverter().toCDKRetentionDays(
        testCase.input
      );
      assert.strictEqual(convertedValue, testCase.expectedOutput);
    });
  });
});

void describe('LogLevelConverter', () => {
  const testCases: Array<TestCase<LogLevel, ApplicationLogLevel>> = [
    {
      input: undefined,
      expectedOutput: undefined,
    },
    {
      input: 'info',
      expectedOutput: ApplicationLogLevel.INFO,
    },
    {
      input: 'debug',
      expectedOutput: ApplicationLogLevel.DEBUG,
    },
    {
      input: 'error',
      expectedOutput: ApplicationLogLevel.ERROR,
    },
    {
      input: 'warn',
      expectedOutput: ApplicationLogLevel.WARN,
    },
    {
      input: 'trace',
      expectedOutput: ApplicationLogLevel.TRACE,
    },
    {
      input: 'fatal',
      expectedOutput: ApplicationLogLevel.FATAL,
    },
  ];

  testCases.forEach((testCase, index) => {
    void it(`converts log retention[${index}]`, () => {
      const convertedValue =
        new LogLevelConverter().toCDKLambdaApplicationLogLevel(testCase.input);
      assert.strictEqual(convertedValue, testCase.expectedOutput);
    });
  });
});

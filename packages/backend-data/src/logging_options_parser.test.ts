import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DataLoggingOptions } from './types.js';
import {
  CDKLoggingOptions,
  convertLoggingOptionsToCDK,
} from './logging_options_parser.js';
import { FieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

type TestCase = {
  description: string;
  input: DataLoggingOptions | undefined;
  expectedOutput: CDKLoggingOptions | undefined;
};

const DEFAULT_LOGGING_OPTIONS = {
  excludeVerboseContent: true,
  fieldLogLevel: FieldLogLevel.NONE,
  retention: RetentionDays.ONE_WEEK,
};

const testCases: Array<TestCase> = [
  {
    description: 'no logging options provided',
    input: undefined,
    expectedOutput: undefined,
  },
  {
    description: 'default - logging: true',
    input: true,
    expectedOutput: DEFAULT_LOGGING_OPTIONS,
  },
  {
    description: 'default - logging: {}',
    input: {},
    expectedOutput: DEFAULT_LOGGING_OPTIONS,
  },
  {
    description: 'custom - excludeVerboseContent: false',
    input: { excludeVerboseContent: false },
    expectedOutput: {
      ...DEFAULT_LOGGING_OPTIONS,
      excludeVerboseContent: false,
    },
  },
  {
    description: 'custom - level: error',
    input: { level: 'error' },
    expectedOutput: {
      ...DEFAULT_LOGGING_OPTIONS,
      fieldLogLevel: FieldLogLevel.ERROR,
    },
  },
  {
    description: 'custom - level: info, retention: 1 month',
    input: { level: 'info', retention: '1 month' },
    expectedOutput: {
      ...DEFAULT_LOGGING_OPTIONS,
      fieldLogLevel: FieldLogLevel.INFO,
      retention: RetentionDays.ONE_MONTH,
    },
  },
  {
    description:
      'custom - excludeVerboseContent: false, level: debug, retention: 13 months',
    input: {
      excludeVerboseContent: false,
      level: 'debug',
      retention: '13 months',
    },
    expectedOutput: {
      excludeVerboseContent: false,
      fieldLogLevel: FieldLogLevel.DEBUG,
      retention: RetentionDays.THIRTEEN_MONTHS,
    },
  },
];

void describe('LoggingOptions converter', () => {
  testCases.forEach((testCase) => {
    void it(`${testCase.description}`, () => {
      const convertedOptions = convertLoggingOptionsToCDK(testCase.input);
      assert.deepStrictEqual(convertedOptions, testCase.expectedOutput);
    });
  });
});

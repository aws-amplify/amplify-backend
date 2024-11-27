import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FunctionLoggingOptions } from './factory.js';
import {
  CDKLoggingOptions,
  convertLoggingOptionsToCDK,
} from './logging_options_parser.js';
import { ApplicationLogLevel, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

type TestCase = {
  input: FunctionLoggingOptions;
  expectedOutput: CDKLoggingOptions;
};

const testCases: Array<TestCase> = [
  {
    input: {},
    expectedOutput: {
      format: undefined,
      level: undefined,
      retention: undefined,
    },
  },
  {
    input: {
      format: 'text',
      retention: '13 months',
    },
    expectedOutput: {
      format: LoggingFormat.TEXT,
      retention: RetentionDays.THIRTEEN_MONTHS,
      level: undefined,
    },
  },
  {
    input: {
      format: 'json',
      level: 'debug',
    },
    expectedOutput: {
      format: LoggingFormat.JSON,
      retention: undefined,
      level: ApplicationLogLevel.DEBUG,
    },
  },
];

void describe('LoggingOptions converter', () => {
  testCases.forEach((testCase, index) => {
    void it(`converts to cdk options[${index}]`, () => {
      const convertedOptions = convertLoggingOptionsToCDK(testCase.input);
      assert.deepStrictEqual(convertedOptions, testCase.expectedOutput);
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FunctionLoggingOptions } from './factory.js';
import {
  CDKLoggingOptions,
  convertLoggingOptionsToCDK,
  createLogGroup,
} from './logging_options_parser.js';
import { ApplicationLogLevel, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

type ConversionTestCase = {
  input: FunctionLoggingOptions;
  expectedOutput: CDKLoggingOptions;
};

const conversionTestCases: Array<ConversionTestCase> = [
  {
    input: {},
    expectedOutput: {
      format: undefined,
      level: undefined,
    },
  },
  {
    input: {
      format: 'text',
      retention: '13 months',
    },
    expectedOutput: {
      format: LoggingFormat.TEXT,
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
      level: ApplicationLogLevel.DEBUG,
    },
  },
];

void describe('LoggingOptions converter', () => {
  conversionTestCases.forEach((testCase, index) => {
    void it(`converts to cdk options[${index}]`, () => {
      const convertedOptions = convertLoggingOptionsToCDK(testCase.input);
      assert.deepStrictEqual(convertedOptions, testCase.expectedOutput);
    });
  });

  void it('createLogGroup creates a log group with proper retention', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    const logGroup = createLogGroup(stack, 'test-function', {
      retention: '13 months',
    });

    // Check that the log group was created
    assert.ok(logGroup instanceof LogGroup);

    // Verify the synthesized CloudFormation template
    const template = Template.fromStack(stack);

    // Ensure we found exactly one log group
    template.resourceCountIs('AWS::Logs::LogGroup', 1);

    // Verify retention period (13 months = 400 days)
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 400,
    });
  });
});

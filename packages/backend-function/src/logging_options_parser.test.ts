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

    // We can't easily check the CDK properties from the instance
    // So we verify the synthesized CloudFormation template
    const template = JSON.parse(
      JSON.stringify(app.synth().getStackArtifact('TestStack').template),
    );

    // Find the LogGroup resource
    const logGroupResources = Object.values(template.Resources).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (resource: any) => resource.Type === 'AWS::Logs::LogGroup',
    );

    // Ensure we found exactly one log group
    assert.strictEqual(logGroupResources.length, 1);

    const logGroupResource = logGroupResources[0] as {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Properties: { RetentionInDays: number };
    };
    assert.strictEqual(logGroupResource.Properties.RetentionInDays, 400); // 13 months = 400 days
  });
});

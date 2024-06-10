import { beforeEach, describe, it, mock } from 'node:test';
import { LambdaFunctionLogStreamer } from './lambda_function_log_streamer.js';
import assert from 'node:assert';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';

import {
  CloudFormationClient,
  DescribeStacksOutput,
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import {
  LambdaClient,
  ListTagsCommand,
  ListTagsCommandOutput,
} from '@aws-sdk/client-lambda';
import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';
import { Printer } from '@aws-amplify/cli-core';
import { BackendIdentifier, BackendOutput } from '@aws-amplify/plugin-types';
import { TagName } from '@aws-amplify/platform-core';
import { parse as parseArn } from '@aws-sdk/util-arn-parser';

void describe('LambdaFunctionLogStreamer', () => {
  const region = 'test-region';
  const customerDefinedFunctions = JSON.stringify([
    'func1FullName',
    'func2FullName',
  ]);

  // CFN default implementation
  const cfnClientMock = new CloudFormationClient({ region });
  const cfnClientSendMock = mock.fn(() => {
    return Promise.resolve({
      Stacks: [
        {
          StackId:
            'arn:aws:cloudformation:us-west-2:123456789012:stack/stack-name/uuid',
        },
      ],
    } as DescribeStacksOutput);
  });
  mock.method(cfnClientMock, 'send', cfnClientSendMock);

  // CW default implementation
  const cloudWatchClientMock = new CloudWatchLogsClient({ region });
  const cloudWatchClientSendMock = mock.fn();
  mock.method(cloudWatchClientMock, 'send', cloudWatchClientSendMock);

  // Lambda default implementation.
  // Given a resource Arn with lambda function name with `FullName` suffix, this will return the function name with `friendlyName` as suffix
  const lambdaClientMock = new LambdaClient({ region });
  const lambdaClientSendMock = mock.fn((listTagsCommand: ListTagsCommand) => {
    return Promise.resolve({
      Tags: {
        [TagName.FRIENDLY_NAME]: parseArn(listTagsCommand.input.Resource ?? '')
          .resource?.split(':')[1]
          .replace('FullName', 'FriendlyName'),
      } as unknown as ListTagsCommandOutput,
    });
  });
  mock.method(lambdaClientMock, 'send', lambdaClientSendMock);

  // backendOutputClient default implementation
  const testSandboxBackendId: BackendIdentifier = {
    name: 'testName',
    namespace: 'testNamespace',
    type: 'sandbox',
  };
  const backendOutputClientMock = {
    getOutput: mock.fn(() => {
      return Promise.resolve({
        ['AWS::Amplify::Function']: {
          payload: {
            definedFunctions: customerDefinedFunctions,
          },
          version: '1',
        },
      } as BackendOutput);
    }),
  };

  const printer = {
    log: mock.fn(),
    print: mock.fn(),
  };

  const cloudWatchLogMonitorMock = {
    activate: mock.fn(),
    pause: mock.fn(),
    addLogGroups: mock.fn(),
  };

  const classUnderTest = new LambdaFunctionLogStreamer(
    lambdaClientMock,
    cfnClientMock,
    cloudWatchLogMonitorMock as unknown as CloudWatchLogEventMonitor,
    backendOutputClientMock as unknown as BackendOutputClient,
    printer as unknown as Printer
  );

  beforeEach(() => {
    cfnClientSendMock.mock.resetCalls();
    cloudWatchClientSendMock.mock.resetCalls();
    lambdaClientSendMock.mock.resetCalls();
    backendOutputClientMock.getOutput.mock.resetCalls();
    cloudWatchLogMonitorMock.activate.mock.resetCalls();
    cloudWatchLogMonitorMock.pause.mock.resetCalls();
    cloudWatchLogMonitorMock.addLogGroups.mock.resetCalls();
  });

  void it('return early if streaming is disabled', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: false,
    });

    // No lambda calls to retrieve tags
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 0);
  });

  void it('return early if no function category is found in the backend', async () => {
    backendOutputClientMock.getOutput.mock.mockImplementationOnce(() => {
      return Promise.resolve({} as BackendOutput);
    });
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
    });

    // No lambda calls to retrieve tags
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 0);
  });

  void it('return early if no functions are found in the functions category', async () => {
    backendOutputClientMock.getOutput.mock.mockImplementationOnce(() => {
      return Promise.resolve({
        functionOutputKey: {
          payload: {
            definedFunctions: '',
          },
          version: '1',
        },
      } as BackendOutput);
    });
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
    });

    // No lambda calls to retrieve tags
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 0);
  });

  void it('calls logs monitor with all the customer defined functions if no function name filter is provided', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
    });

    // assert that lambda calls to retrieve tags were with the right function arn
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 2);
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[0].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func1FullName'
    );
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[1].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func2FullName'
    );

    // assert that logs groups were added to the monitor and was then called activate
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.callCount(),
      2
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[0],
      'func1FriendlyName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[1],
      '/aws/lambda/func1FullName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[1].arguments[0],
      'func2FriendlyName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[1].arguments[1],
      '/aws/lambda/func2FullName'
    );
    assert.strictEqual(cloudWatchLogMonitorMock.activate.mock.callCount(), 1);
  });

  void it('calls logs monitor with only the functions that matches the provided logs filter', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
      logsFilters: [
        'func1', // It's a regex
      ],
    });

    // assert that lambda calls to retrieve tags were with the right function arn
    // We do it for all customer defined functions, filtering happens after
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 2);
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[0].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func1FullName'
    );
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[1].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func2FullName'
    );

    // assert that logs groups were added to the monitor for only filtered functions and was then called activate
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.callCount(),
      1
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[0],
      'func1FriendlyName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[1],
      '/aws/lambda/func1FullName'
    );
    assert.strictEqual(cloudWatchLogMonitorMock.activate.mock.callCount(), 1);
  });

  void it('calls logs monitor with only the functions that matches the provided logs filter regex', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
      logsFilters: ['func.?FriendlyName'],
    });

    // assert that lambda calls to retrieve tags were with the right function arn
    // We do it for all customer defined functions, filtering happens after
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 2);
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[0].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func1FullName'
    );
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[1].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func2FullName'
    );

    // assert that logs groups were added to the monitor for only filtered functions and was then called activate
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.callCount(),
      2
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[0],
      'func1FriendlyName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[0].arguments[1],
      '/aws/lambda/func1FullName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[1].arguments[0],
      'func2FriendlyName'
    );
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.calls[1].arguments[1],
      '/aws/lambda/func2FullName'
    );
    assert.strictEqual(cloudWatchLogMonitorMock.activate.mock.callCount(), 1);
  });

  void it('does not add any log groups to monitor if the provided filter matches nothing', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
      logsFilters: ['filterThatMatchesNothing'],
    });

    // assert that lambda calls to retrieve tags were with the right function arn
    // We do it for all customer defined functions, filtering happens after
    assert.strictEqual(lambdaClientSendMock.mock.callCount(), 2);
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[0].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func1FullName'
    );
    assert.strictEqual(
      lambdaClientSendMock.mock.calls[1].arguments[0].input.Resource,
      'arn:aws:lambda:us-west-2:123456789012:function:func2FullName'
    );

    // assert that no logs groups were added to the monitor
    assert.strictEqual(
      cloudWatchLogMonitorMock.addLogGroups.mock.callCount(),
      0
    );
  });

  void it('calls logs monitor with the output file location set', async () => {
    await classUnderTest.startStreamingLogs(testSandboxBackendId, {
      enabled: true,
      logsOutFile: 'someFileName',
    });
    assert.strictEqual(cloudWatchLogMonitorMock.activate.mock.callCount(), 1);
    assert.strictEqual(
      cloudWatchLogMonitorMock.activate.mock.calls[0].arguments[0],
      'someFileName'
    );
  });

  void it('calling stopWatchingLogs deactivates the log monitor', () => {
    classUnderTest.stopStreamingLogs();
    assert.strictEqual(cloudWatchLogMonitorMock.pause.mock.callCount(), 1);
  });
});

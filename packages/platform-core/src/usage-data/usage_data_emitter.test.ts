import { after, afterEach, before, describe, mock, test } from 'node:test';
import assert from 'node:assert';
import { DefaultUsageDataEmitter } from './usage_data_emitter';
import { v4, validate } from 'uuid';
import url from 'url';
import https from 'https';
import http from 'http';
import fs from 'fs';
import os from 'os';
import { AccountIdFetcher } from './account_id_fetcher';
import { UsageData } from './usage_data';
import isCI from 'is-ci';
import { AmplifyError, AmplifyUserError } from '..';

const originalNpmUserAgent = process.env.npm_config_user_agent;
const testNpmUserAgent = 'testNpmUserAgent';

void describe('UsageDataEmitter', () => {
  let usageDataEmitter: DefaultUsageDataEmitter;

  const testLibraryVersion = '1.2.3';
  const testDependencies = [
    {
      name: 'aws-cdk',
      version: '1.2.3',
    },
    {
      name: 'aws-cdk-lib',
      version: '12.13.14',
    },
    {
      name: 'test-dep',
      version: '1.2.4',
    },
    {
      name: 'some_other_dep',
      version: '12.12.14',
    },
  ];
  const testURL = url.parse('https://aws.amazon.com/amplify/');
  const onReqEndMock = mock.fn();
  const onReqWriteMock = mock.fn();
  const reqMock = {
    setTimeout: mock.fn(),
    on: mock.fn(),
    write: onReqWriteMock,
    end: onReqEndMock,
  } as unknown as http.ClientRequest;

  // For getInstallationUuid which retrieves it from PackageJsonReader
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFile', () =>
    Promise.resolve(JSON.stringify({ name: 'testAppName' })),
  );

  // For AccountIdFetcher
  const accountIdFetcherMock = {
    fetch: async () => '123456789012',
  } as AccountIdFetcher;

  mock.method(https, 'request', () => reqMock);

  before(() => {
    process.env.npm_config_user_agent = testNpmUserAgent;
  });

  after(() => {
    process.env.npm_config_user_agent = originalNpmUserAgent;
  });

  afterEach(() => {
    onReqEndMock.mock.resetCalls();
    onReqEndMock.mock.restore();
    onReqWriteMock.mock.resetCalls();
    onReqWriteMock.mock.restore();
  });

  void test('happy case, emitSuccess generates and send correct usage data', async () => {
    await setupAndInvokeUsageEmitter({
      isSuccess: true,
      metrics: { synthesisTime: 5.3, totalTime: 20.6 },
    });

    const usageDataSent: UsageData = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0],
    );

    assert.deepStrictEqual(usageDataSent.accountId, '123456789012');
    assert.deepStrictEqual(usageDataSent.amplifyCliVersion, '1.2.3');
    assert.deepStrictEqual(usageDataSent.payloadVersion, '1.1.0');
    assert.deepStrictEqual(usageDataSent.state, 'SUCCEEDED');
    assert.deepStrictEqual(usageDataSent.input, {
      command: 'testCommandName',
      plugin: 'Gen2',
    });
    // Numbers should be well rounded, Redshift doesn't like fractions
    assert.deepStrictEqual(usageDataSent.codePathDurations, {
      totalDuration: 21,
      platformStartup: 5,
    });
    assert.deepStrictEqual(usageDataSent.isCi, isCI);
    assert.deepStrictEqual(usageDataSent.osPlatform, os.platform());
    assert.deepStrictEqual(usageDataSent.osRelease, os.release());
    assert.deepStrictEqual(
      usageDataSent.projectSetting.editor,
      testNpmUserAgent,
    );
    assert.ok(validate(usageDataSent.sessionUuid));
    assert.ok(validate(usageDataSent.installationUuid));
    assert.ok(usageDataSent.error == undefined);
    assert.ok(usageDataSent.downstreamException == undefined);
    assert.deepStrictEqual(
      usageDataSent.projectSetting.details,
      JSON.stringify([
        {
          name: 'aws-cdk-lib',
          version: '12.13.14',
        },
      ]),
    );
  });

  void test('happy case, emitFailure generates and send correct usage data', async () => {
    const error = new AmplifyUserError(
      'BackendBuildError',
      {
        message: 'some error message',
        resolution: 'test resolution',
      },
      new Error('some downstream exception'),
    );
    await setupAndInvokeUsageEmitter({ isSuccess: false, error });

    const usageDataSent: UsageData = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0],
    );

    assert.deepStrictEqual(usageDataSent.accountId, '123456789012');
    assert.deepStrictEqual(usageDataSent.amplifyCliVersion, '1.2.3');
    assert.deepStrictEqual(usageDataSent.payloadVersion, '1.1.0');
    assert.deepStrictEqual(usageDataSent.state, 'FAILED');
    assert.deepStrictEqual(usageDataSent.input, {
      command: 'testCommandName',
      plugin: 'Gen2',
    });
    assert.deepStrictEqual(usageDataSent.codePathDurations, {});
    assert.deepStrictEqual(usageDataSent.isCi, isCI);
    assert.deepStrictEqual(usageDataSent.osPlatform, os.platform());
    assert.deepStrictEqual(usageDataSent.osRelease, os.release());
    assert.deepStrictEqual(
      usageDataSent.projectSetting.editor,
      testNpmUserAgent,
    );
    assert.ok(validate(usageDataSent.sessionUuid));
    assert.ok(validate(usageDataSent.installationUuid));
    assert.deepStrictEqual(usageDataSent.error, { name: 'BackendBuildError' });
    assert.deepStrictEqual(usageDataSent.downstreamException, {
      name: 'Error',
    });
  });

  void describe('does not include free-form error text in usage data', () => {
    const canary = 'AMPX_TEST_CANARY_VALUE';

    const assertNoCanary = (serializedPayload: string) => {
      assert.ok(!serializedPayload.includes(canary), serializedPayload);
      // yargs also reports camelCase variants of unknown option names, e.g. xAMPXTESTCANARYVALUE
      const normalizedPayload = serializedPayload
        .toLowerCase()
        .replaceAll(/[^a-z0-9]/g, '');
      assert.ok(
        !normalizedPayload.includes(canary.toLowerCase().replaceAll('_', '')),
        serializedPayload,
      );
    };

    const createParserError = (message: string) => {
      const error = new Error(message);
      error.name = 'YError';
      return error;
    };

    const testCases: Array<{
      description: string;
      error: AmplifyError;
      command: string;
      expectedErrorName: string;
      expectedDownstreamExceptionName?: string;
    }> = [
      {
        description: 'undeclared positional argument after a command',
        error: AmplifyError.fromError(
          createParserError(`Unknown command: ${canary}`),
        ),
        command: 'generate outputs <unknown>',
        expectedErrorName: 'InvalidCommandInputError',
        expectedDownstreamExceptionName: 'YError',
      },
      {
        description: 'invalid argument value',
        error: new AmplifyUserError('InvalidCommandInputError', {
          message: `Invalid value provided: ${canary}`,
          details: `details ${canary}`,
          resolution: `resolution ${canary}`,
        }),
        command: 'generate outputs',
        expectedErrorName: 'InvalidCommandInputError',
      },
      {
        description: 'unknown option name',
        error: AmplifyError.fromError(
          createParserError(
            `Unknown arguments: x-${canary}, x${canary.replaceAll('_', '')}`,
          ),
        ),
        command: 'sandbox',
        expectedErrorName: 'InvalidCommandInputError',
        expectedDownstreamExceptionName: 'YError',
      },
      {
        description: 'unknown command',
        error: AmplifyError.fromError(
          createParserError(`Unknown command: ${canary}`),
        ),
        command: '<unknown>',
        expectedErrorName: 'InvalidCommandInputError',
        expectedDownstreamExceptionName: 'YError',
      },
      {
        description: 'unexpected error with a cause',
        error: AmplifyError.fromError(
          new Error(`outer ${canary}`, {
            cause: new Error(`inner ${canary}`),
          }),
        ),
        command: 'generate outputs',
        expectedErrorName: 'UnknownFault',
        expectedDownstreamExceptionName: 'Error',
      },
    ];

    for (const testCase of testCases) {
      void test(testCase.description, async () => {
        await setupAndInvokeUsageEmitter({
          isSuccess: false,
          error: testCase.error,
          command: testCase.command,
        });

        const serializedPayload: string =
          onReqWriteMock.mock.calls[0].arguments[0];
        assertNoCanary(serializedPayload);

        const usageDataSent: UsageData = JSON.parse(serializedPayload);
        assert.deepStrictEqual(usageDataSent.input, {
          command: testCase.command,
          plugin: 'Gen2',
        });
        assert.deepStrictEqual(usageDataSent.error, {
          name: testCase.expectedErrorName,
        });
        assert.deepStrictEqual(
          usageDataSent.downstreamException,
          testCase.expectedDownstreamExceptionName
            ? { name: testCase.expectedDownstreamExceptionName }
            : undefined,
        );
      });
    }
  });

  /**
   * Lots of acrobatics done here to be able to mock nodejs https library (which doesn't support promises)
   * and node:test library which doesn't have the best mocking mechanism.
   *
   * 1. Create a mock for https and override the 4 methods called in the class under test
   * 2. Add a hook in the `req.end()` event handler implementation so we know when the listener is available to grab
   * 3. Grab the event listener attached in the `req.end()` event handler
   * 4. Call the listener which signifies that the request is completed and the Promise in the code would resolve
   * 5. Now get hold of all the event handlers for assertions.
   */
  const setupAndInvokeUsageEmitter = async (testData: {
    isSuccess: boolean;
    error?: AmplifyError;
    metrics?: Record<string, number>;
    command?: string;
  }) => {
    const reqEndHandlerAttached = new Promise<void>((resolve) => {
      onReqEndMock.mock.mockImplementationOnce(() => {
        resolve();
      });
    });

    usageDataEmitter = new DefaultUsageDataEmitter(
      testLibraryVersion,
      testDependencies,
      v4(),
      testURL,
      accountIdFetcherMock,
    );

    const dimensions = { command: testData.command ?? 'testCommandName' };
    let usageDataEmitterPromise;
    if (testData.isSuccess) {
      usageDataEmitterPromise = usageDataEmitter.emitSuccess(
        testData.metrics,
        dimensions,
      );
    } else if (testData.error) {
      usageDataEmitterPromise = usageDataEmitter.emitFailure(
        testData.error,
        dimensions,
      );
    }

    await reqEndHandlerAttached;
    const onReqEndCallBackFn = onReqEndMock.mock.calls[0].arguments[0];
    // Signify that it is the end of the request
    onReqEndCallBackFn();
    await usageDataEmitterPromise;
  };
});

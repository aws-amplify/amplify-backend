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
    Promise.resolve(JSON.stringify({ name: 'testAppName' }))
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
      onReqWriteMock.mock.calls[0].arguments[0]
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
      testNpmUserAgent
    );
    assert.ok(validate(usageDataSent.sessionUuid));
    assert.ok(validate(usageDataSent.installationUuid));
    assert.ok(usageDataSent.error == undefined);
    assert.ok(usageDataSent.downstreamException == undefined);
  });

  void test('happy case, emitFailure generates and send correct usage data', async () => {
    const error = new AmplifyUserError(
      'BackendBuildError',
      {
        message: 'some error message',
        resolution: 'test resolution',
      },
      new Error('some downstream exception')
    );
    await setupAndInvokeUsageEmitter({ isSuccess: false, error });

    const usageDataSent: UsageData = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0]
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
      testNpmUserAgent
    );
    assert.ok(validate(usageDataSent.sessionUuid));
    assert.ok(validate(usageDataSent.installationUuid));
    assert.strictEqual(usageDataSent.error?.message, 'some error message');
    assert.ok(
      usageDataSent.downstreamException?.message == 'some downstream exception'
    );
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
  }) => {
    const reqEndHandlerAttached = new Promise<void>((resolve) => {
      onReqEndMock.mock.mockImplementationOnce(() => {
        resolve();
      });
    });

    usageDataEmitter = new DefaultUsageDataEmitter(
      testLibraryVersion,
      v4(),
      testURL,
      accountIdFetcherMock
    );

    let usageDataEmitterPromise;
    if (testData.isSuccess) {
      usageDataEmitterPromise = usageDataEmitter.emitSuccess(testData.metrics, {
        command: 'testCommandName',
      });
    } else if (testData.error) {
      usageDataEmitterPromise = usageDataEmitter.emitFailure(testData.error, {
        command: 'testCommandName',
      });
    }

    await reqEndHandlerAttached;
    const onReqEndCallBackFn = onReqEndMock.mock.calls[0].arguments[0];
    // Signify that it is the end of the request
    onReqEndCallBackFn();
    await usageDataEmitterPromise;
  };
});

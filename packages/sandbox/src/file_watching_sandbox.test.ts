import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import path from 'path';
import watcher, { subscribe as _subscribe } from '@parcel/watcher';
import {
  CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME,
  FileWatchingSandbox,
  getBootstrapUrl,
} from './file_watching_sandbox.js';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import {
  BackendDeployerFactory,
  BackendDeployerOutputFormatter,
} from '@aws-amplify/backend-deployer';
import fs from 'fs';
import parseGitIgnore from 'parse-gitignore';
import _open from 'open';
import {
  SecretListItem,
  getSecretClientWithAmplifyErrorHandling,
} from '@aws-amplify/backend-secret';
import { Sandbox, SandboxOptions } from './sandbox.js';
import {
  AmplifyPrompter,
  LogLevel,
  PackageManagerControllerFactory,
  Printer,
  format,
} from '@aws-amplify/cli-core';
import { URL, fileURLToPath } from 'url';
import { AmplifyIOHost, BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { LambdaFunctionLogStreamer } from './lambda_function_log_streamer.js';
import {
  ParameterNotFound,
  SSMClient,
  SSMServiceException,
} from '@aws-sdk/client-ssm';
import { EOL } from 'os';

// Watcher mocks
const unsubscribeMockFn = mock.fn();
const subscribeMock = mock.fn<
  (
    ...args: Parameters<typeof _subscribe>
  ) => Promise<{ unsubscribe: typeof unsubscribeMockFn }>
>(async () => {
  return { unsubscribe: unsubscribeMockFn };
});
const packageManagerControllerFactory = new PackageManagerControllerFactory(
  process.cwd(),
  new Printer(LogLevel.DEBUG),
);
const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};
const mockIoHost: AmplifyIOHost = {
  notify: mock.fn(),
  requestResponse: mock.fn(),
};
const mockProfileResolver = mock.fn();

const backendDeployerFactory = new BackendDeployerFactory(
  packageManagerControllerFactory.getPackageManagerController(),
  formatterStub,
  mockIoHost,
  mockProfileResolver,
);
const backendDeployer = backendDeployerFactory.getInstance();

const secretClient = getSecretClientWithAmplifyErrorHandling();
const newlyUpdatedSecretItem: SecretListItem = {
  name: 'C',
  lastUpdated: new Date(1234567),
};

const listSecretMock = mock.method(secretClient, 'listSecrets', () =>
  Promise.resolve([
    {
      name: 'A',
      lastUpdated: new Date(1234),
    },
    {
      name: 'B',
    },
    newlyUpdatedSecretItem,
  ]),
);
const printer = {
  log: mock.fn(),
  print: mock.fn(),
  clearConsole: mock.fn(),
  printNewLine: mock.fn(),
};

const sandboxExecutor = new AmplifySandboxExecutor(
  backendDeployer,
  secretClient,
  printer as unknown as Printer,
);

const backendDeployerDeployMock = mock.method(backendDeployer, 'deploy', () =>
  Promise.resolve({ deploymentTimes: { totalTime: 0, synthesisTime: 0 } }),
);
const backendDeployerDestroyMock = mock.method(backendDeployer, 'destroy', () =>
  Promise.resolve(),
);
const region = 'test-region';
const ssmClientMock = new SSMClient({ region });
const ssmClientSendMock = mock.fn(() =>
  Promise.resolve({
    Parameter: {
      Name: CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME,
      Value: '18',
    },
  }),
);

mock.method(ssmClientMock, 'send', ssmClientSendMock);
const openMock = mock.fn(_open, (url: string) => Promise.resolve(url));

const functionsLogStreamerMock = {
  startStreamingLogs: mock.fn(),
  stopStreamingLogs: mock.fn(),
};

const testPath = path.join('test', 'location');

mock.method(fs, 'lstatSync', (path: string) => {
  if (path === testPath || path === `${process.cwd()}/${testPath}`) {
    return { isFile: () => false, isDir: () => true };
  }
  return {
    isFile: () => {
      throw new Error(`ENOENT: no such file or directory, lstat '${path}'`);
    },
    isDir: () => false,
  };
});

const testSandboxBackendId: BackendIdentifier = {
  namespace: 'testSandboxId',
  name: 'testSandboxName',
  type: 'sandbox',
};

void describe('Sandbox to check if region is bootstrapped', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(
      fs,
      'existsSync',
      (p: string) => path.basename(p) !== '.gitignore',
    );
    sandboxInstance = new FileWatchingSandbox(
      async () => testSandboxBackendId,
      sandboxExecutor,
      ssmClientMock,
      functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      printer as unknown as Printer,
      openMock as never,
      subscribeMock as never,
    );

    ssmClientSendMock.mock.resetCalls();
    openMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
  });

  afterEach(async () => {
    ssmClientSendMock.mock.resetCalls();
    openMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    await sandboxInstance.stop();

    // Printer mocks are reset after the sandbox stop to reset the "Shutting down" call as well.
    printer.log.mock.resetCalls();
    printer.print.mock.resetCalls();
  });

  void it('when region has not bootstrapped, then opens console to initiate bootstrap', async () => {
    ssmClientSendMock.mock.mockImplementationOnce(() => {
      throw new ParameterNotFound({
        $metadata: {},
        message: 'Parameter not found',
      });
    });

    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(ssmClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 1);
    assert.strictEqual(
      openMock.mock.calls[0].arguments[0],
      getBootstrapUrl(region),
    );
    assert.strictEqual(printer.log.mock.callCount(), 1);
    assert.strictEqual(
      printer.log.mock.calls[0].arguments[0],
      `The region ${format.highlight(
        region,
      )} has not been bootstrapped. Sign in to the AWS console as a Root user or Admin to complete the bootstrap process, then restart the sandbox.${EOL}If this is not the region you are expecting to bootstrap, check for any AWS environment variables that may be set in your shell or use ${format.command(
        '--profile <profile-name>',
      )} to specify a profile with the correct region.`,
    );
    assert.strictEqual(printer.log.mock.calls[0].arguments[1], undefined);
  });

  void it('when region has not bootstrapped, and opening console url fails prints url to initiate bootstrap', async () => {
    ssmClientSendMock.mock.mockImplementationOnce(() => {
      throw new ParameterNotFound({
        $metadata: {},
        message: 'Parameter not found',
      });
    });

    openMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('open error')),
    );

    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(ssmClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 1);
    assert.strictEqual(
      openMock.mock.calls[0].arguments[0],
      getBootstrapUrl(region),
    );
    assert.strictEqual(printer.log.mock.callCount(), 3);
    assert.strictEqual(
      printer.log.mock.calls[0].arguments[0],
      `The region ${format.highlight(
        region,
      )} has not been bootstrapped. Sign in to the AWS console as a Root user or Admin to complete the bootstrap process, then restart the sandbox.${EOL}If this is not the region you are expecting to bootstrap, check for any AWS environment variables that may be set in your shell or use ${format.command(
        '--profile <profile-name>',
      )} to specify a profile with the correct region.`,
    );
    assert.strictEqual(printer.log.mock.calls[0].arguments[1], undefined);
    assert.strictEqual(
      printer.log.mock.calls[1].arguments[0],
      'Unable to open bootstrap url, open error',
    );
    assert.strictEqual(printer.log.mock.calls[1].arguments[1], LogLevel.DEBUG);
    assert.strictEqual(
      printer.log.mock.calls[2].arguments[0],
      `Open ${getBootstrapUrl(region)} in the browser.`,
    );
    assert.strictEqual(printer.log.mock.calls[2].arguments[1], undefined);
  });

  void it('when user does not have proper credentials throw user error', async () => {
    const error = new SSMServiceException({
      name: 'UnrecognizedClientException',
      $fault: 'client',
      $metadata: {},
      message: 'The security token included in the request is invalid.',
    });
    ssmClientSendMock.mock.mockImplementationOnce(() => {
      throw error;
    });

    await assert.rejects(
      () => sandboxInstance.start({}),
      new AmplifyUserError(
        'SSMCredentialsError',
        {
          message:
            'UnrecognizedClientException: The security token included in the request is invalid.',
          resolution:
            'Make sure your AWS credentials are set up correctly and have permissions to call SSM:GetParameter',
        },
        error,
      ),
    );
  });

  void it('when region has bootstrapped, but with a version lower than the minimum (6), then opens console to initiate bootstrap', async () => {
    ssmClientSendMock.mock.mockImplementationOnce(() =>
      Promise.resolve({
        Parameter: {
          Name: CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME,
          Value: '5',
        },
      }),
    );

    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(ssmClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 1);
    assert.strictEqual(
      openMock.mock.calls[0].arguments[0],
      getBootstrapUrl(region),
    );
  });

  void it('when region has bootstrapped, resumes sandbox command successfully', async () => {
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(ssmClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 0);
  });
});

void describe('Sandbox using local project name resolver', () => {
  let sandboxInstance: Sandbox;
  let fileChangeEventCallback: watcher.SubscribeCallback;
  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(
      fs,
      'existsSync',
      (p: string) => path.basename(p) !== '.gitignore',
    );
  });

  afterEach(async () => {
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    ssmClientSendMock.mock.resetCalls();
    functionsLogStreamerMock.startStreamingLogs.mock.resetCalls();
    await sandboxInstance.stop();

    // deactivate mock is reset after the sandbox stop
    functionsLogStreamerMock.stopStreamingLogs.mock.resetCalls();

    // Printer mocks are reset after the sandbox stop to reset the "Shutting down" call as well.
    printer.log.mock.resetCalls();
    printer.print.mock.resetCalls();
  });

  void it('correctly displays the sandbox name at the startup and helper message when --identifier is not provided', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      undefined,
      false,
    ));
    assert.strictEqual(printer.print.mock.callCount(), 5);

    assert.strictEqual(
      printer.print.mock.calls[1].arguments[0],
      format.indent(`${format.bold('Identifier:')} \ttestSandboxName`),
    );
    assert.strictEqual(
      printer.print.mock.calls[4].arguments[0],
      `${format.indent(
        format.dim('\nTo specify a different sandbox identifier, use '),
      )}${format.bold('--identifier')}`,
    );
  });

  void it('correctly displays the region at the startup', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      undefined,
      false,
    ));
    assert.strictEqual(printer.print.mock.callCount(), 5);

    assert.strictEqual(
      printer.print.mock.calls[3].arguments[0],
      format.indent(`${format.bold('Region:')} \ttest-region`),
    );
  });

  void it('makes initial deployment without type checking at start if no typescript file is present', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        // imaginary dir does not have any ts files
        dir: 'testDir',
        exclude: ['exclude1', 'exclude2'],
      },
      false,
    ));

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: false,
      },
    ]);
  });

  void it('makes initial deployment with type checking at start if some typescript file is present', async () => {
    // using this file's dir, mocking a glob search appears to be impossible
    const testDir = path.dirname(fileURLToPath(new URL(import.meta.url)));

    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        dir: testDir,
        exclude: ['exclude1', 'exclude2'],
      },
      false,
    ));

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('calls BackendDeployer once when a file change is present', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        dir: 'testDir',
        exclude: ['exclude1', 'exclude2'],
      },
    ));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: ['.amplify', 'exclude1', 'exclude2'],
    });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(listSecretMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    assert.strictEqual(ssmClientSendMock.mock.callCount(), 0);
  });

  void it('calls watcher subscribe with the default "./amplify" if no `dir` specified', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], './amplify');
  });

  void it('calls BackendDeployer only once when multiple file changes are present', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test2.ts' },
      { type: 'create', path: 'foo/test3.ts' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('skips type checking if no typescript change is detected', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test2.txt' },
      { type: 'create', path: 'foo/test3.txt' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: false,
      },
    ]);
  });

  void it('calls BackendDeployer once when multiple file changes are within few milliseconds (debounce)', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    // Not awaiting for this file event to be processed and submitting another one right away
    const firstFileChange = fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test4.ts' },
    ]);
    // Second file change is non typescript file
    // so that we assert that ts file change is not lost
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test4.txt' },
    ]);
    await firstFileChange;
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('waits for file changes after completing a deployment and deploys again', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test5.ts' },
    ]);
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test6.ts' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 2);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[1].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('queues deployment if a file change is detected during an ongoing deployment', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    // Mimic BackendDeployer taking 200 ms.
    backendDeployerDeployMock.mock.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { deploymentTimes: {}, stdout: '', stderr: '' };
    });

    // Not awaiting so we can push another file change while deployment is ongoing
    const firstFileChange = fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test7.ts' },
    ]);

    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 150));

    // second file change while the previous one is 'ongoing'
    const secondFileChange = fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test8.ts' },
    ]);

    await Promise.all([firstFileChange, secondFileChange]);

    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 2);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[1].arguments, [
      testSandboxBackendId,
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('calls BackendDeployer destroy when delete is called', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    await sandboxInstance.delete({});

    // BackendDeployer should be called once to destroy
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      testSandboxBackendId,
    ]);
  });

  void it('handles error thrown by BackendDeployer and does not crash while deploying', async (contextual) => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    const mockEmit = mock.fn();
    contextual.mock.method(sandboxInstance, 'emit', mockEmit);
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () => Promise.reject(new Error('random BackendDeployer error')),
      { times: 1 },
    );

    // This test validates that the first file change didn't crash the sandbox process and the second
    // file change will trigger the BackendDeployer again!
    const firstFileChange = fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);
    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 200));
    // second file change
    const secondFileChange = fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test2.ts' },
    ]);

    await Promise.all([firstFileChange, secondFileChange]);
    // contextual backendDeployer should have been called once (throwing error)
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);

    // global backendDeployer should have been called once for the successful change
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);

    // of the two file change events, successfulDeployment event should only be fired once
    assert.strictEqual(mockEmit.mock.callCount(), 2);
    assert.strictEqual(mockEmit.mock.calls[0].arguments[0], 'failedDeployment');
    assert.strictEqual(
      mockEmit.mock.calls[1].arguments[0],
      'successfulDeployment',
    );

    // assert print statements are called correctly
    assert.strictEqual(printer.log.mock.callCount(), 15);
    assert.match(
      printer.log.mock.calls[5].arguments[0],
      /random BackendDeployer error/,
    );
    assert.strictEqual(printer.log.mock.calls[5].arguments[1], LogLevel.ERROR);
    assert.strictEqual(
      printer.log.mock.calls[6].arguments[0],
      'Stack Trace for UnknownFault',
    );
    assert.strictEqual(printer.log.mock.calls[6].arguments[1], LogLevel.DEBUG);
    assert.match(
      printer.log.mock.calls[7].arguments[0],
      /file_watching_sandbox.ts/,
    );
    assert.strictEqual(printer.log.mock.calls[7].arguments[1], LogLevel.DEBUG);
  });

  void it('handles UpdateNotSupported error while deploying and offers to reset sandbox and customer says yes', async (contextual) => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () =>
        Promise.reject(
          new AmplifyUserError('CFNUpdateNotSupportedError', {
            message: 'some error message',
            resolution: 'test resolution',
          }),
        ),
      { times: 1 }, //mock implementation once
    );
    // User said yes to reset
    const promptMock = contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true),
    );

    // Execute a change that fails with UpdateNotSupported
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // Assertions
    // prompt must have been presented to user
    assert.strictEqual(promptMock.mock.callCount(), 1);
    assert.strictEqual(
      promptMock.mock.calls[0].arguments[0]?.message,
      'Would you like to recreate your sandbox (deleting all user data)?',
    );

    // reset must have been called, first delete and then start
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);
    // Contextual BackendDeployer should have been called once (for the unsupported change)
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);
    // Global BackendDeployer should have been called once (for the reset)
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('handles UpdateNotSupported error while deploying and offers to reset sandbox and customer says no, continues running sandbox', async (contextual) => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () =>
        Promise.reject(
          new AmplifyUserError('CFNUpdateNotSupportedError', {
            message: 'some error message',
            resolution: 'test resolution',
          }),
        ),
      { times: 1 }, //mock implementation once
    );
    // User said no to reset
    const promptMock = contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(false),
    );

    // Execute a change that fails with UpdateNotSupported
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);
    // Execute another change that succeeds
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // Assertions
    // prompt must have been presented to user
    assert.strictEqual(promptMock.mock.callCount(), 1);
    assert.strictEqual(
      promptMock.mock.calls[0].arguments[0]?.message,
      'Would you like to recreate your sandbox (deleting all user data)?',
    );

    // reset must not have been called, i.e. delete shouldn't be called
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 0);
    // Contextual BackendDeployer should have been called once (for the unsupported change)
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);
    // Global BackendDeployer should have been called once (for the new change after)
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('handles error thrown by BackendDeployer and terminate while destroying', async (contextual) => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        dir: 'testDir',
        exclude: ['exclude1', 'exclude2'],
      },
    ));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'destroy',
      () => Promise.reject(new Error('random BackendDeployer error')),
    );

    await assert.rejects(() => sandboxInstance.delete({}), {
      message: 'random BackendDeployer error',
    });

    // BackendDeployer should have been called once
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);
  });

  void it('correctly handles user provided appName while deploying', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      { identifier: 'customSandboxName' },
    ));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(listSecretMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right app name
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      {
        name: 'customSandboxName',
        namespace: 'testSandboxId',
        type: 'sandbox',
      },
      {
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('correctly handles user provided appName while destroying', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      { identifier: 'customSandboxName' },
    ));
    await sandboxInstance.delete({ identifier: 'customSandboxName' });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      {
        namespace: 'testSandboxId',
        name: 'customSandboxName',
        type: 'sandbox',
      },
    ]);
  });

  void it('handles .gitignore files to exclude paths from file watching', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => true);
    contextual.mock.method(parseGitIgnore, 'parse', () => {
      return {
        patterns: [
          '/patternWithLeadingSlash',
          'patternWithoutLeadingSlash',
          'someFile.js',
          'overlap/',
          'overlap/file',
        ],
      };
    });
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        exclude: ['customer_exclude1', 'customer_exclude2'],
      },
    ));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right excludes
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: [
        '.amplify',
        'patternWithLeadingSlash',
        'patternWithoutLeadingSlash',
        'someFile.js',
        'overlap/',
        'overlap/file',
        'customer_exclude1',
        'customer_exclude2',
      ],
    });

    // BackendDeployer should also be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('handles !files in .gitignore and filter them out', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => true);
    contextual.mock.method(parseGitIgnore, 'parse', () => {
      return {
        patterns: [
          '/patternWithLeadingSlash',
          'patternWithoutLeadingSlash',
          'someFile.js',
          '!patternThatShouldNotBeIncluded',
          'overlap/',
          'overlap/file',
        ],
      };
    });
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        exclude: ['customer_exclude1', 'customer_exclude2'],
      },
    ));
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right excludes and not include patternThatShouldNotBeIncluded
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: [
        '.amplify',
        'patternWithLeadingSlash',
        'patternWithoutLeadingSlash',
        'someFile.js',
        'overlap/',
        'overlap/file',
        'customer_exclude1',
        'customer_exclude2',
      ],
    });

    // BackendDeployer should also be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('emits the successfulDeployment event after deployment', async (contextual) => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));

    const mockEmit = mock.fn();
    contextual.mock.method(sandboxInstance, 'emit', mockEmit);

    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    assert.strictEqual(mockEmit.mock.callCount(), 1);
  });

  void it('emits the successfulDeletion event after delete is finished', async () => {
    const mockListener = mock.fn();
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      ssmClient: ssmClientMock,
      functionsLogStreamer:
        functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
    }));

    sandboxInstance.on('successfulDeletion', mockListener);

    await sandboxInstance.delete({});

    assert.equal(mockListener.mock.callCount(), 1);
  });

  void it('should trigger single deployment without watcher if watchForChanges is false', async () => {
    await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      { watchForChanges: false },
    );

    assert.strictEqual(subscribeMock.mock.callCount(), 0);
  });

  void it('start lambda function log watcher regardless if asked to in sandbox options', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {}, // not enabling lambda function log watcher
      false,
    ));

    // Lambda function log streamer is expected to turn itself off if enabled
    assert.strictEqual(
      functionsLogStreamerMock.stopStreamingLogs.mock.callCount(),
      1,
    );
    assert.strictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.callCount(),
      1,
    );
    assert.strictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.calls[0].arguments[1],
      undefined,
    );
  });

  void it('starts lambda function log watcher if explicitly asked to in sandbox options', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        functionStreamingOptions: {
          enabled: true,
          logsFilters: ['func1', 'func2'],
          logsOutFile: 'testFileName',
        }, // enabling lambda function log watcher
      },
      false,
    ));

    assert.strictEqual(
      functionsLogStreamerMock.stopStreamingLogs.mock.callCount(),
      1, // We deactivate before making any deployment, even the first one.
    );
    assert.strictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.callCount(),
      1,
    );
    assert.deepStrictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.calls[0].arguments[0],
      {
        namespace: 'testSandboxId',
        name: 'testSandboxName',
        type: 'sandbox',
      },
    );
    assert.deepStrictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.calls[0].arguments[1],
      {
        enabled: true,
        logsFilters: ['func1', 'func2'],
        logsOutFile: 'testFileName',
      },
    );
  });

  void it('pauses log monitor during a deployment and restarts after it is finished', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        ssmClient: ssmClientMock,
        functionsLogStreamer:
          functionsLogStreamerMock as unknown as LambdaFunctionLogStreamer,
      },
      {
        functionStreamingOptions: {
          enabled: true,
          logsFilters: ['func1', 'func2'],
          logsOutFile: 'testFileName',
        }, // enabling lambda function log watcher
      },
    ));

    // Initial deployment
    assert.strictEqual(
      functionsLogStreamerMock.stopStreamingLogs.mock.callCount(),
      1, // We deactivate before making any deployment, even the first one.
    );
    assert.strictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.callCount(),
      1,
    );

    // Make another deployment
    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    assert.strictEqual(
      functionsLogStreamerMock.stopStreamingLogs.mock.callCount(),
      2, // We deactivated again before starting this second deployment.
    );
    assert.strictEqual(
      functionsLogStreamerMock.startStreamingLogs.mock.callCount(),
      2, // We resume watching logs after the second deployment is finished.
    );
  });
});

/**
 * Create a new sandbox instance to test and extracts the file watcher
 * event handler after starting the sandbox. This handler can be called
 * by the tests to simulate file save events.
 *
 * Both the instance and the event handler are returned.
 */
const setupAndStartSandbox = async (
  testData: SandboxTestData,
  sandboxOptions: SandboxOptions = {},
  resetMocksAfterStart = true,
) => {
  const sandboxInstance = new FileWatchingSandbox(
    async (customName) => ({
      namespace: 'testSandboxId',
      name: customName ?? testData.sandboxName ?? 'testSandboxName',
      type: 'sandbox',
    }),
    testData.executor,
    testData.ssmClient,
    testData.functionsLogStreamer,
    printer as unknown as Printer,
    testData.open ?? _open,
    subscribeMock as never,
  );

  await sandboxInstance.start(sandboxOptions);

  // At this point one deployment should already have been done on sandbox startup
  assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  // and client config generated only once

  if (resetMocksAfterStart) {
    // Reset all the calls to avoid extra startup call
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    ssmClientSendMock.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  }

  if (sandboxOptions.watchForChanges === false) {
    return {
      sandboxInstance,
      fileChangeEventCallback: () => {
        throw new Error(
          'When not watching for changes, file change event callback is not available',
        );
      },
    };
  }
  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  let fileChangeEventCallback: watcher.SubscribeCallback;
  if (
    subscribeMock.mock.calls[0].arguments[1] &&
    typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
  ) {
    fileChangeEventCallback = subscribeMock.mock.calls[0].arguments[1];
  } else {
    throw new Error(
      'fileChangeEventCallback was not available after starting sandbox',
    );
  }

  return { sandboxInstance, fileChangeEventCallback };
};

type SandboxTestData = {
  // To instantiate sandbox
  sandboxName?: string;
  executor: AmplifySandboxExecutor;
  ssmClient: SSMClient;
  functionsLogStreamer: LambdaFunctionLogStreamer;
  open?: typeof _open;
};

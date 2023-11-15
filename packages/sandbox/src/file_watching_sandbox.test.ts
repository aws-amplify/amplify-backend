import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import path from 'path';
import watcher from '@parcel/watcher';
import {
  CDK_BOOTSTRAP_STACK_NAME,
  CDK_BOOTSTRAP_VERSION_KEY,
  FileWatchingSandbox,
  getBootstrapUrl,
} from './file_watching_sandbox.js';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import fs from 'fs';
import parseGitIgnore from 'parse-gitignore';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import _open from 'open';
import { SecretListItem, getSecretClient } from '@aws-amplify/backend-secret';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { Sandbox } from './sandbox.js';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { fileURLToPath } from 'url';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

// Watcher mocks
const unsubscribeMockFn = mock.fn();
const subscribeMock = mock.method(watcher, 'subscribe', async () => {
  return { unsubscribe: unsubscribeMockFn };
});

const backendDeployer = BackendDeployerFactory.getInstance();

const secretClient = getSecretClient();
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
  ])
);

const sandboxExecutor = new AmplifySandboxExecutor(
  backendDeployer,
  secretClient
);

const backendDeployerDeployMock = mock.method(backendDeployer, 'deploy', () =>
  Promise.resolve()
);
const backendDeployerDestroyMock = mock.method(backendDeployer, 'destroy', () =>
  Promise.resolve()
);
const region = 'test-region';
const cfnClientMock = new CloudFormationClient({ region });
const cfnClientSendMock = mock.fn();
mock.method(cfnClientMock, 'send', cfnClientSendMock);
cfnClientSendMock.mock.mockImplementation(() =>
  Promise.resolve({
    Stacks: [
      {
        Name: CDK_BOOTSTRAP_STACK_NAME,
        Outputs: [
          {
            Description:
              'The version of the bootstrap resources that are currently mastered in this stack',
            OutputKey: CDK_BOOTSTRAP_VERSION_KEY,
            OutputValue: '18',
          },
        ],
      },
    ],
  })
);
const openMock = mock.fn(_open, (url: string) => Promise.resolve(url));

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
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox(
      async () => testSandboxBackendId,
      sandboxExecutor,
      cfnClientMock,
      openMock as never
    );

    cfnClientSendMock.mock.resetCalls();
    openMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
  });

  afterEach(async () => {
    cfnClientSendMock.mock.resetCalls();
    openMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  void it('when region has not bootstrapped, then opens console to initiate bootstrap', async () => {
    cfnClientSendMock.mock.mockImplementationOnce(() => {
      throw new Error('Stack with id CDKToolkit does not exist');
    });

    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(cfnClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 1);
    assert.strictEqual(
      openMock.mock.calls[0].arguments[0],
      getBootstrapUrl(region)
    );
  });

  void it('when region has bootstrapped, but with a version lower than the minimum (6), then opens console to initiate bootstrap', async () => {
    cfnClientSendMock.mock.mockImplementationOnce(() =>
      Promise.resolve({
        Stacks: [
          {
            Name: CDK_BOOTSTRAP_STACK_NAME,
            Outputs: [
              {
                Description:
                  'The version of the bootstrap resources that are currently mastered in this stack',
                OutputKey: CDK_BOOTSTRAP_VERSION_KEY,
                OutputValue: '5',
              },
            ],
          },
        ],
      })
    );

    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(cfnClientSendMock.mock.callCount(), 1);
    assert.strictEqual(openMock.mock.callCount(), 1);
    assert.strictEqual(
      openMock.mock.calls[0].arguments[0],
      getBootstrapUrl(region)
    );
  });

  void it('when region has bootstrapped, resumes sandbox command successfully', async () => {
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    assert.strictEqual(cfnClientSendMock.mock.callCount(), 1);
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
    mock.method(fs, 'existsSync', () => false);
  });

  afterEach(async () => {
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  void it('makes initial deployment without type checking at start if no typescript file is present', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox(
      {
        executor: sandboxExecutor,
        cfnClient: cfnClientMock,
        // imaginary dir does not have any ts files
        dir: 'testDir',
        exclude: ['exclude1', 'exclude2'],
      },
      false
    ));

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        deploymentType: 'sandbox',
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
        cfnClient: cfnClientMock,
        dir: testDir,
        exclude: ['exclude1', 'exclude2'],
      },
      false
    ));

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('calls BackendDeployer once when a file change is present', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    }));
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    assert.strictEqual(cfnClientSendMock.mock.callCount(), 0);
  });

  void it('calls watcher subscribe with the default "./amplify" if no `dir` specified', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
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
      cfnClient: cfnClientMock,
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('skips type checking if no typescript change is detected', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: false,
      },
    ]);
  });

  void it('calls BackendDeployer once when multiple file changes are within few milliseconds (debounce)', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('waits for file changes after completing a deployment and deploys again', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[1].arguments, [
      testSandboxBackendId,
      {
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('queues deployment if a file change is detected during an ongoing deployment', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));
    // Mimic BackendDeployer taking 200 ms.
    backendDeployerDeployMock.mock.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { stdout: '', stderr: '' };
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[1].arguments, [
      testSandboxBackendId,
      {
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('calls BackendDeployer destroy when delete is called', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));
    await sandboxInstance.delete({});

    // BackendDeployer should be called once to destroy
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      testSandboxBackendId,
      {
        deploymentType: 'sandbox',
      },
    ]);
  });

  void it('handles error thrown by BackendDeployer and does not crash while deploying', async (contextual) => {
    const mockListener = mock.fn();
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));
    sandboxInstance.on('successfulDeployment', mockListener);
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () => Promise.reject(new Error('random BackendDeployer error')),
      { times: 1 }
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
    assert.strictEqual(mockListener.mock.callCount(), 1);
  });

  void it('handles UpdateNotSupported error while deploying and offers to reset sandbox and customer says yes', async (contextual) => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () =>
        Promise.reject(
          new Error('[UpdateNotSupported] random BackendDeployer error')
        ),
      { times: 1 } //mock implementation once
    );
    // User said yes to reset
    const promptMock = contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
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
      'Would you like to recreate your sandbox (deleting all user data)?'
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
      cfnClient: cfnClientMock,
    }));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () =>
        Promise.reject(
          new Error('[UpdateNotSupported] random BackendDeployer error')
        ),
      { times: 1 } //mock implementation once
    );
    // User said no to reset
    const promptMock = contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(false)
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
      'Would you like to recreate your sandbox (deleting all user data)?'
    );

    // reset must not have been called, i.e. delete shouldn't be called
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 0);
    // Contextual BackendDeployer should have been called once (for the unsupported change)
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);
    // Global BackendDeployer should have been called once (for the new change after)
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('handles error thrown by BackendDeployer and terminate while destroying', async (contextual) => {
    ({ sandboxInstance } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    }));
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'destroy',
      () => Promise.reject(new Error('random BackendDeployer error'))
    );

    await assert.rejects(() => sandboxInstance.delete({}), {
      message: 'random BackendDeployer error',
    });

    // BackendDeployer should have been called once
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 1);
  });

  void it('correctly handles user provided appName while deploying', async () => {
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
      name: 'customSandboxName',
    }));
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
        deploymentType: 'sandbox',
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        validateAppSources: true,
      },
    ]);
  });

  void it('correctly handles user provided appName while destroying', async () => {
    ({ sandboxInstance } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
      name: 'customSandboxName',
    }));
    await sandboxInstance.delete({ name: 'customSandboxName' });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      {
        namespace: 'testSandboxId',
        name: 'customSandboxName',
        type: 'sandbox',
      },
      {
        deploymentType: 'sandbox',
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
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
      exclude: ['customer_exclude1', 'customer_exclude2'],
    }));
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

  void it('emits the successfulDeployment event after deployment', async () => {
    const mockListener = mock.fn();
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));

    sandboxInstance.on('successfulDeployment', mockListener);

    await fileChangeEventCallback(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    assert.equal(mockListener.mock.callCount(), 1);
  });

  void it('emits the successfulDeletion event after delete is finished', async () => {
    const mockListener = mock.fn();
    ({ sandboxInstance, fileChangeEventCallback } = await setupAndStartSandbox({
      executor: sandboxExecutor,
      cfnClient: cfnClientMock,
    }));

    sandboxInstance.on('successfulDeletion', mockListener);

    await sandboxInstance.delete({});

    assert.equal(mockListener.mock.callCount(), 1);
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
  resetMocksAfterStart = true
) => {
  const sandboxInstance = new FileWatchingSandbox(
    async (customName) => ({
      namespace: 'testSandboxId',
      name: customName ?? testData.sandboxName ?? 'testSandboxName',
      type: 'sandbox',
    }),
    testData.executor,
    testData.cfnClient,
    testData.open ?? _open
  );

  await sandboxInstance.start({
    dir: testData.dir,
    exclude: testData.exclude,
    name: testData.name,
    format: testData.format,
    profile: testData.profile,
  });

  // At this point one deployment should already have been done on sandbox startup
  assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  // and client config generated only once

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
      'fileChangeEventCallback was not available after starting sandbox'
    );
  }

  if (resetMocksAfterStart) {
    // Reset all the calls to avoid extra startup call
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  }

  return { sandboxInstance, fileChangeEventCallback };
};

type SandboxTestData = {
  // To instantiate sandbox
  sandboxName?: string;
  executor: AmplifySandboxExecutor;
  cfnClient: CloudFormationClient;
  open?: typeof _open;

  // To start sandbox
  dir?: string;
  exclude?: string[];
  name?: string;
  format?: ClientConfigFormat;
  profile?: string;
};

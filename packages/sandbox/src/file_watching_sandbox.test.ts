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
import open from 'open';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { SecretListItem, getSecretClient } from '@aws-amplify/backend-secret';

// Watcher mocks
const unsubscribeMockFn = mock.fn();
const subscribeMock = mock.method(watcher, 'subscribe', async () => {
  return { unsubscribe: unsubscribeMockFn };
});
let fileChangeEventActualFn: watcher.SubscribeCallback;

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
const openMock = mock.fn(open, (url: string) => Promise.resolve(url));

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

void describe('Sandbox to check if region is bootstrapped', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox(
      'testSandboxId',
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
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox(
      'testSandboxId',
      sandboxExecutor,
      cfnClientMock
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });

    // At this point one deployment should already have been done on sandbox startup
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    // and client config generated only once

    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  });

  afterEach(async () => {
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  void it('calls BackendDeployer once when a file change is present', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: ['cdk.out', 'exclude1', 'exclude2'],
    });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(listSecretMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('testSandboxId'),
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        typeCheckingEnabled: true,
      },
    ]);
    assert.strictEqual(cfnClientSendMock.mock.callCount(), 0);
  });

  void it('calls BackendDeployer once when multiple file changes are present', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test2.ts' },
      { type: 'create', path: 'foo/test3.ts' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('calls BackendDeployer once when multiple file changes are within few milliseconds (debounce)', async () => {
    // Not awaiting for this file event to be processed and submitting another one right away
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test4.ts' }]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test4.ts' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
  });

  void it('waits for file changes after completing a deployment and deploys again', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test5.ts' },
    ]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test6.ts' },
    ]);
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 2);
  });

  void it('queues deployment if a file change is detected during an ongoing', async () => {
    // Mimic BackendDeployer taking 200 ms.
    backendDeployerDeployMock.mock.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { stdout: '', stderr: '' };
    });

    // Not awaiting so we can push another file change while deployment is ongoing
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test7.ts' }]);

    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 100));

    // second file change while the previous one is 'ongoing'
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test8.ts' }]);

    // Wait sufficient time for both deployments to have finished before we count number of BackendDeployer calls.
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 2);
  });

  void it('calls BackendDeployer destroy when delete is called', async () => {
    await sandboxInstance.delete({});

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('testSandboxId'),
      { deploymentType: BackendDeploymentType.SANDBOX },
    ]);
  });

  void it('handles error thrown by BackendDeployer and does not crash while deploying', async (contextual) => {
    const contextualBackendDeployerMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () => Promise.reject(new Error('random BackendDeployer error'))
    );

    // This test validates that the first file change didn't crash the sandbox process and the second
    // file change will trigger the BackendDeployer again!
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test1.ts' }]);
    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 200));
    // second file change
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test2.ts' }]);
    // Wait sufficient time for both deployments to have finished before we count number of BackendDeployer calls.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // BackendDeployer should have been called twice
    assert.strictEqual(contextualBackendDeployerMock.mock.callCount(), 2);
  });

  void it('handles error thrown by BackendDeployer and terminate while destroying', async (contextual) => {
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
});

void describe('Sandbox with user provided app name', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox(
      'testSandboxId',
      sandboxExecutor,
      cfnClientMock
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
      name: 'customSandboxName',
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  });

  afterEach(async () => {
    backendDeployerDestroyMock.mock.resetCalls();
    backendDeployerDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  void it('calls BackendDeployer once when a file change is present and user provided appName', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: ['cdk.out', 'exclude1', 'exclude2'],
    });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(listSecretMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('customSandboxName'),
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        typeCheckingEnabled: true,
      },
    ]);
  });

  void it('calls BackendDeployer destroy when delete is called with a user provided sandbox name', async () => {
    await sandboxInstance.delete({ name: 'customSandboxName' });

    // BackendDeployer should be called once
    assert.strictEqual(backendDeployerDestroyMock.mock.callCount(), 1);

    // BackendDeployer should be called with the right params
    assert.deepEqual(backendDeployerDestroyMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('customSandboxName'),
      { deploymentType: BackendDeploymentType.SANDBOX },
    ]);
  });
});

void describe('Sandbox with absolute output path', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox(
      'testSandboxId',
      sandboxExecutor,
      cfnClientMock
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
      name: 'customSandboxName',
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    backendDeployerDeployMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
  });

  afterEach(async () => {
    backendDeployerDeployMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    await sandboxInstance.stop();
  });
});

void describe('Sandbox ignoring paths in .gitignore', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // setup .gitignore such that parseGitIgnore returns a list of parsed paths
    mock.method(fs, 'existsSync', () => true);
    mock.method(parseGitIgnore, 'parse', () => {
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
    sandboxInstance = new FileWatchingSandbox(
      'testSandboxId',
      sandboxExecutor,
      cfnClientMock
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['customer_exclude1', 'customer_exclude2'],
      name: 'customSandboxName',
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    backendDeployerDeployMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
  });

  afterEach(async () => {
    backendDeployerDeployMock.mock.resetCalls();
    backendDeployerDestroyMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  void it('handles .gitignore files to exclude paths from file watching', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: [
        'cdk.out',
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
    const mockDeploy = mock.fn();
    mockDeploy.mock.mockImplementation(async () => null);
    const executor: AmplifySandboxExecutor = {
      deploy: mockDeploy,
    } as unknown as AmplifySandboxExecutor;
    const sandbox = new FileWatchingSandbox(
      'my-sandbox',
      executor,
      cfnClientMock
    );
    sandbox.on('successfulDeployment', mockListener);
    await sandbox.start({});
    assert.equal(mockListener.mock.callCount(), 1);
  });
});

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import watcher from '@parcel/watcher';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { FileWatchingSandbox } from './file_watching_sandbox.js';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import fs from 'fs';
import parseGitIgnore from 'parse-gitignore';

// Watcher mocks
const unsubscribeMockFn = mock.fn();
const subscribeMock = mock.method(watcher, 'subscribe', async () => {
  return { unsubscribe: unsubscribeMockFn };
});
let fileChangeEventActualFn: watcher.SubscribeCallback;

const backendDeployer = BackendDeployerFactory.getInstance();
const execaDeployMock = mock.method(backendDeployer, 'deploy', () =>
  Promise.resolve()
);
const execaDestroyMock = mock.method(backendDeployer, 'destroy', () =>
  Promise.resolve()
);

mock.method(fs, 'lstatSync', (path: string) => {
  const testPath = 'test/location';
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

describe('Sandbox using local project name resolver', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  const cdkExecutor = new AmplifySandboxExecutor(backendDeployer);

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox('testSandboxId', cdkExecutor);
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
      format: ClientConfigFormat.JS,
    });

    // At this point one deployment should already have been done on sandbox startup
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);
    // and client config generated only once

    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    execaDestroyMock.mock.resetCalls();
    execaDeployMock.mock.resetCalls();
  });

  afterEach(async () => {
    execaDestroyMock.mock.resetCalls();
    execaDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('calls CDK once when a file change is present', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: ['cdk.out', 'exclude1', 'exclude2'],
    });

    // CDK should be called once
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaDeployMock.mock.calls[0].arguments, [
      {
        branchName: 'sandbox',
        backendId: 'testSandboxId',
      },
      {
        hotswapFallback: true,
        method: 'direct',
      },
    ]);
  });

  it('calls CDK once when multiple file changes are present', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test2.ts' },
      { type: 'create', path: 'foo/test3.ts' },
    ]);
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);
  });

  it('calls CDK once when multiple file changes are within few milliseconds (debounce)', async () => {
    // Not awaiting for this file event to be processed and submitting another one right away
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test4.ts' }]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test4.ts' },
    ]);
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);
  });

  it('waits for file changes after completing a deployment and deploys again', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test5.ts' },
    ]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test6.ts' },
    ]);
    assert.strictEqual(execaDeployMock.mock.callCount(), 2);
  });

  it('queues deployment if a file change is detected during an ongoing', async () => {
    // Mimic cdk taking 200 ms.
    execaDeployMock.mock.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { stdout: '', stderr: '' };
    });

    // Not awaiting so we can push another file change while deployment is ongoing
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test7.ts' }]);

    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 100));

    // second file change while the previous one is 'ongoing'
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test8.ts' }]);

    // Wait sufficient time for both deployments to have finished before we count number of cdk calls.
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.strictEqual(execaDeployMock.mock.callCount(), 2);
  });

  it('calls CDK destroy when delete is called', async () => {
    await sandboxInstance.delete({});

    // CDK should be called once
    assert.strictEqual(execaDestroyMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaDestroyMock.mock.calls[0].arguments, [
      {
        branchName: 'sandbox',
        backendId: 'testSandboxId',
      },
    ]);
  });

  it('handles error thrown by cdk and does not crash', async (contextual) => {
    const contextualExecaMock = contextual.mock.method(
      backendDeployer,
      'deploy',
      () => Promise.reject(new Error('random cdk error'))
    );

    // This test validates that the first file change didn't crash the sandbox process and the second
    // file change will trigger the CDK again!
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test1.ts' }]);
    // Get over debounce so that the next deployment is considered valid
    await new Promise((resolve) => setTimeout(resolve, 100));
    // second file change
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test2.ts' }]);
    // Wait sufficient time for both deployments to have finished before we count number of cdk calls.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // CDK should have been called twice
    assert.strictEqual(contextualExecaMock.mock.callCount(), 2);
  });
});

describe('Sandbox with user provided app name', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  const cdkExecutor = new AmplifySandboxExecutor(backendDeployer);

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox('testSandboxId', cdkExecutor);
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
    execaDestroyMock.mock.resetCalls();
    execaDeployMock.mock.resetCalls();
  });

  afterEach(async () => {
    execaDestroyMock.mock.resetCalls();
    execaDeployMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('calls CDK once when a file change is present and user provided appName', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: ['cdk.out', 'exclude1', 'exclude2'],
    });

    // CDK should be called once
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaDeployMock.mock.calls[0].arguments, [
      {
        branchName: 'sandbox',
        backendId: 'customSandboxName',
      },
      {
        hotswapFallback: true,
        method: 'direct',
      },
    ]);
  });

  it('calls CDK destroy when delete is called with a user provided sandbox name', async () => {
    await sandboxInstance.delete({ name: 'customSandboxName' });

    // CDK should be called once
    assert.strictEqual(execaDestroyMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaDestroyMock.mock.calls[0].arguments, [
      {
        branchName: 'sandbox',
        backendId: 'customSandboxName',
      },
    ]);
  });
});

describe('Sandbox with absolute output path', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  const cdkExecutor = new AmplifySandboxExecutor(backendDeployer);

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    // ensures that .gitignore is set as absent
    mock.method(fs, 'existsSync', () => false);
    sandboxInstance = new FileWatchingSandbox('testSandboxId', cdkExecutor);
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
      name: 'customSandboxName',
      profile: 'amplify-sandbox',
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }

    // Reset all the calls to avoid extra startup call
    execaDeployMock.mock.resetCalls();
    execaDestroyMock.mock.resetCalls();
  });

  afterEach(async () => {
    execaDeployMock.mock.resetCalls();
    execaDestroyMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('sets AWS profile when starting sandbox', async () => {
    assert.strictEqual(process.env.AWS_PROFILE, 'amplify-sandbox');
  });
});

describe('Sandbox ignoring paths in .gitignore', () => {
  // class under test
  let sandboxInstance: FileWatchingSandbox;

  const cdkExecutor = new AmplifySandboxExecutor(backendDeployer);

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
    sandboxInstance = new FileWatchingSandbox('testSandboxId', cdkExecutor);
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
    execaDeployMock.mock.resetCalls();
    execaDestroyMock.mock.resetCalls();
  });

  afterEach(async () => {
    execaDeployMock.mock.resetCalls();
    execaDestroyMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('handles .gitignore files to exclude paths from file watching', async () => {
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

    // CDK should also be called once
    assert.strictEqual(execaDeployMock.mock.callCount(), 1);
  });
});

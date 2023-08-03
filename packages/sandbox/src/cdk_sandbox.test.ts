import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import watcher from '@parcel/watcher';
import { CDKSandbox } from './cdk_sandbox.js';
import assert from 'node:assert';
import { AmplifyCDKExecutor } from './cdk_executor.js';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import path from 'node:path';

// Watcher mocks
const unsubscribeMockFn = mock.fn();
const subscribeMock = mock.method(watcher, 'subscribe', async () => {
  return { unsubscribe: unsubscribeMockFn };
});
let fileChangeEventActualFn: watcher.SubscribeCallback;

// Client config mocks
const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
  mock.fn()
);
const generateClientConfigMock = mock.method(
  clientConfigGeneratorAdapter,
  'generateClientConfigToFile',
  () => Promise.resolve('testClientConfig')
);

describe('Sandbox using local project name resolver', () => {
  // class under test
  let sandboxInstance: CDKSandbox;

  const cdkExecutor = new AmplifyCDKExecutor();
  const execaMock = mock.method(cdkExecutor, 'executeChildProcess', () =>
    Promise.resolve()
  );

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    sandboxInstance = new CDKSandbox(
      'testApp',
      'test1234',
      clientConfigGeneratorAdapter,
      cdkExecutor
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }
  });

  afterEach(async () => {
    execaMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    generateClientConfigMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('calls CDK once when a file change is present with right arguments', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: [
        'cdk.out',
        path.join(process.cwd(), 'amplifyconfiguration.json'),
        'exclude1',
        'exclude2',
      ],
    });

    // CDK should be called once
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'cdk',
        'deploy',
        '--app',
        "'npx tsx amplify/backend.ts'",
        '--context',
        'app-name=testApp',
        '--context',
        'branch-name=sandbox',
        '--context',
        'disambiguator=test1234',
        '--hotswap-fallback',
        '--method=direct',
      ],
    ]);
  });

  it('calls CDK once when multiple file changes are present', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test2.ts' },
      { type: 'create', path: 'foo/test3.ts' },
    ]);
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // and client config generated only once
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });

  it('calls CDK once when multiple file changes are within few milliseconds (debounce)', async () => {
    // Not awaiting for this file event to be processed and submitting another one right away
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test4.ts' }]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test4.ts' },
    ]);
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // and client config written only once
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });

  it('waits for file changes after completing a deployment and deploys again', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test5.ts' },
    ]);
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test6.ts' },
    ]);
    assert.strictEqual(execaMock.mock.callCount(), 2);

    // and client config written twice as well
    assert.equal(generateClientConfigMock.mock.callCount(), 2);
  });

  it('queues deployment if a file change is detected during an ongoing', async () => {
    // Mimic cdk taking 200 ms.
    execaMock.mock.mockImplementationOnce(async () => {
      await new Promise((res) => setTimeout(res, 200));
      return { stdout: '', stderr: '' };
    });

    // Not awaiting so we can push another file change while deployment is ongoing
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test7.ts' }]);

    // Get over debounce so that the next deployment is considered valid
    await new Promise((res) => setTimeout(res, 100));

    // second file change while the previous one is 'ongoing'
    fileChangeEventActualFn(null, [{ type: 'update', path: 'foo/test8.ts' }]);

    // Wait sufficient time for both deployments to have finished before we count number of cdk calls.
    await new Promise((res) => setTimeout(res, 500));

    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(generateClientConfigMock.mock.callCount(), 2);
  });

  it('writes the correct client-config to default cwd path', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.equal(generateClientConfigMock.mock.callCount(), 1);

    // generate was called with right arguments
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      { appName: 'testApp', branchName: 'sandbox', disambiguator: 'test1234' }
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      process.cwd() + '/amplifyconfiguration.json'
    );
  });

  it('calls CDK destroy when delete is called', async () => {
    await sandboxInstance.delete({});

    // CDK should be called once
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'cdk',
        'destroy',
        '--app',
        "'npx tsx amplify/backend.ts'",
        '--context',
        'app-name=testApp',
        '--context',
        'branch-name=sandbox',
        '--context',
        'disambiguator=test1234',
        '--force',
      ],
    ]);
  });
});

describe('Sandbox with user provided app name', () => {
  // class under test
  let sandboxInstance: CDKSandbox;

  const cdkExecutor = new AmplifyCDKExecutor();
  const execaMock = mock.method(cdkExecutor, 'executeChildProcess', () =>
    Promise.resolve()
  );

  /**
   * For each test we start the sandbox and hence file watcher and get hold of
   * file change event function which tests can simulate by calling as desired.
   */
  beforeEach(async () => {
    sandboxInstance = new CDKSandbox(
      'testApp',
      'test1234',
      clientConfigGeneratorAdapter,
      cdkExecutor
    );
    await sandboxInstance.start({
      dir: 'testDir',
      exclude: ['exclude1', 'exclude2'],
      name: 'userAppName',
      clientConfigOutputPath: 'test/location',
    });
    if (
      subscribeMock.mock.calls[0].arguments[1] &&
      typeof subscribeMock.mock.calls[0].arguments[1] === 'function'
    ) {
      fileChangeEventActualFn = subscribeMock.mock.calls[0].arguments[1];
    }
  });

  afterEach(async () => {
    execaMock.mock.resetCalls();
    subscribeMock.mock.resetCalls();
    generateClientConfigMock.mock.resetCalls();
    await sandboxInstance.stop();
  });

  it('calls CDK once when a file change is present and user provided appName', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    // File watcher should be called with right arguments such as dir and excludes
    assert.strictEqual(subscribeMock.mock.calls[0].arguments[0], 'testDir');
    assert.deepStrictEqual(subscribeMock.mock.calls[0].arguments[2], {
      ignore: [
        'cdk.out',
        'test/location/amplifyconfiguration.json',
        'exclude1',
        'exclude2',
      ],
    });

    // CDK should be called once
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'cdk',
        'deploy',
        '--app',
        "'npx tsx amplify/backend.ts'",
        '--context',
        'app-name=userAppName',
        '--context',
        'branch-name=sandbox',
        '--context',
        'disambiguator=test1234',
        '--hotswap-fallback',
        '--method=direct',
      ],
    ]);

    // and client config written only once
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });

  it('calls CDK destroy when delete is called with a user provided appName', async () => {
    await sandboxInstance.delete({ name: 'userProvidedName' });

    // CDK should be called once
    assert.strictEqual(execaMock.mock.callCount(), 1);

    // CDK should be called with the right params
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'cdk',
        'destroy',
        '--app',
        "'npx tsx amplify/backend.ts'",
        '--context',
        'app-name=userProvidedName',
        '--context',
        'branch-name=sandbox',
        '--context',
        'disambiguator=test1234',
        '--force',
      ],
    ]);
  });

  it('writes the correct client-config to user provided path', async () => {
    await fileChangeEventActualFn(null, [
      { type: 'update', path: 'foo/test1.ts' },
    ]);

    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.equal(generateClientConfigMock.mock.callCount(), 1);

    // generate was called with right arguments
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      {
        appName: 'userAppName',
        branchName: 'sandbox',
        disambiguator: 'test1234',
      }
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      'test/location' + '/amplifyconfiguration.json'
    );
  });
});

import assert from 'assert';
import fsp from 'fs/promises';
import { beforeEach, describe, it, mock } from 'node:test';
import { createAmplifyDepUpdater } from './create_amplify_dep_updater.js';

void describe('createAmplifyDepUpdater', () => {
  const mockedFsReadFile = mock.method(fsp, 'readFile', () =>
    JSON.stringify({
      defaultDevPackages: [
        '@aws-amplify/backend',
        '@aws-amplify/backend-cli',
        'aws-cdk@2.0.0',
        'aws-cdk-lib@2.0.0',
        'constructs@^10.0.0',
        'typescript@^5.0.0',
        'tsx',
        'esbuild',
      ],
      defaultProdPackages: ['aws-amplify'],
    })
  );
  const mockedFsWriteFile = mock.method(fsp, 'writeFile', mock.fn());

  beforeEach(() => {
    mockedFsReadFile.mock.resetCalls();
    mockedFsWriteFile.mock.resetCalls();
  });

  void it('successfully pins new version', async () => {
    await createAmplifyDepUpdater([{ name: 'aws-cdk', version: '2.1.0' }]);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify({
        defaultDevPackages: [
          '@aws-amplify/backend',
          '@aws-amplify/backend-cli',
          'aws-cdk@2.1.0', // updated
          'aws-cdk-lib@2.0.0',
          'constructs@^10.0.0',
          'typescript@^5.0.0',
          'tsx',
          'esbuild',
        ],
        defaultProdPackages: ['aws-amplify'],
      })
    );
  });

  void it('successfully pins multiple new versions', async () => {
    await createAmplifyDepUpdater([
      { name: 'aws-cdk', version: '2.1.0' },
      { name: 'aws-cdk-lib', version: '2.2.0' },
    ]);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify({
        defaultDevPackages: [
          '@aws-amplify/backend',
          '@aws-amplify/backend-cli',
          'aws-cdk@2.1.0', // updated
          'aws-cdk-lib@2.2.0', // updated
          'constructs@^10.0.0',
          'typescript@^5.0.0',
          'tsx',
          'esbuild',
        ],
        defaultProdPackages: ['aws-amplify'],
      })
    );
  });

  void it('does nothing if there are no provided dependencies', async () => {
    await createAmplifyDepUpdater([]);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 0);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 0);
  });

  void it('does nothing if provided dependencies are not part of target dependencies for updates', async () => {
    await createAmplifyDepUpdater([{ name: 'test-dep', version: '2.1.0' }]);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 0);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 0);
  });

  void it('does not update if provided dependency versions already match create amplify dependencies', async () => {
    await createAmplifyDepUpdater([
      { name: 'aws-cdk', version: '2.0.0' },
      { name: 'aws-cdk-lib', version: '2.0.0' },
    ]);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 0);
  });
});

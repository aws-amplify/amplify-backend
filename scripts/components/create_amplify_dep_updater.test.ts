import assert from 'assert';
import fsp from 'fs/promises';
import { beforeEach, describe, it, mock } from 'node:test';
import { EOL } from 'os';
import { createAmplifyDepUpdater } from './create_amplify_dep_updater.js';

void describe('createAmplifyDepUpdater', () => {
  const mockedFsReadFile = mock.method(
    fsp,
    'readFile',
    () =>
      `export const defaultDevPackages = [${EOL}` +
      `'@aws-amplify/backend',${EOL}` +
      `'@aws-amplify/backend-cli',${EOL}` +
      `'aws-cdk@2.0.0',${EOL}` +
      `'aws-cdk-lib@2.0.0',${EOL}` +
      `'constructs@^10.0.0',${EOL}` +
      `'typescript@^5.0.0',${EOL}` +
      `'tsx',${EOL}` +
      `'esbuild',${EOL}` +
      `];${EOL}` +
      `${EOL}` +
      `export const defaultProdPackages = ['aws-amplify'];${EOL}`
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
      `export const defaultDevPackages = [${EOL}` +
        `'@aws-amplify/backend',${EOL}` +
        `'@aws-amplify/backend-cli',${EOL}` +
        `'aws-cdk@2.1.0',${EOL}` + // updated
        `'aws-cdk-lib@2.0.0',${EOL}` +
        `'constructs@^10.0.0',${EOL}` +
        `'typescript@^5.0.0',${EOL}` +
        `'tsx',${EOL}` +
        `'esbuild',${EOL}` +
        `];${EOL}` +
        `${EOL}` +
        `export const defaultProdPackages = ['aws-amplify'];${EOL}`
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
      `export const defaultDevPackages = [${EOL}` +
        `'@aws-amplify/backend',${EOL}` +
        `'@aws-amplify/backend-cli',${EOL}` +
        `'aws-cdk@2.1.0',${EOL}` + // updated
        `'aws-cdk-lib@2.2.0',${EOL}` + // updated
        `'constructs@^10.0.0',${EOL}` +
        `'typescript@^5.0.0',${EOL}` +
        `'tsx',${EOL}` +
        `'esbuild',${EOL}` +
        `];${EOL}` +
        `${EOL}` +
        `export const defaultProdPackages = ['aws-amplify'];${EOL}`
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
});

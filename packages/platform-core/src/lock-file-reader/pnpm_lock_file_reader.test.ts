import assert from 'assert';
import fsp from 'fs/promises';
import { afterEach, describe, it, mock } from 'node:test';
import path from 'path';
import { PnpmLockFileReader } from './pnpm_lock_file_reader';

void describe('PnpmLockFileReader', () => {
  const fspReadFileMock = mock.method(
    fsp,
    'readFile',
    // eslint-disable-next-line spellcheck/spell-checker
    () => `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      aws-amplify:
        specifier: ^6.12.0
        version: 6.12.0
    devDependencies:
      '@aws-amplify/backend':
        specifier: ^1.11.0
        version: 1.12.0(@aws-sdk/client-cloudformation@3.723.0)(@aws-sdk/client-s3@3.723.0)(@aws-sdk/client-sso-oidc@3.621.0(@aws-sdk/client-sts@3.621.0))(@aws-sdk/types@3.723.0)(aws-cdk-lib@2.174.1(constructs@10.4.2))(constructs@10.4.2)(zod@3.24.1)
      '@aws-amplify/backend-cli':
        specifier: ^1.4.5
        version: 1.4.6(@aws-sdk/client-sso-oidc@3.621.0(@aws-sdk/client-sts@3.621.0))(@aws-sdk/client-sts@3.621.0)(@aws-sdk/types@3.723.0)(aws-cdk-lib@2.174.1(constructs@10.4.2))(aws-cdk@2.174.1)(constructs@10.4.2)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)(typescript@5.7.2)
      aws-cdk:
        specifier: ^2.173.4
        version: 2.174.1
      aws-cdk-lib:
        specifier: ^2.173.4
        version: 2.174.1(constructs@10.4.2)
      constructs:
        specifier: ^10.4.2
        version: 10.4.2
      esbuild:
        specifier: ^0.24.2
        version: 0.24.2
      tsx:
        specifier: ^4.19.2
        version: 4.19.2
      typescript:
        specifier: ^5.7.2
        version: 5.7.2

packages:

  '@test_dep@1.2.3':
    resolution: {integrity: some-sha}
    engines: {node: '>=6.0.0'}

  'some_other_dep@12.13.14':
    resolution: {integrity: some-other-sha}
    engines: {node: '>=8'}`
  );
  const pnpmLockFileReader = new PnpmLockFileReader();

  afterEach(() => {
    fspReadFileMock.mock.resetCalls();
  });

  void it('can get lock file contents from cwd', async () => {
    const lockFileContents =
      await pnpmLockFileReader.getLockFileContentsFromCwd();
    const expectedLockFileContents = {
      dependencies: [
        {
          name: '@test_dep',
          version: '1.2.3',
        },
        {
          name: 'some_other_dep',
          version: '12.13.14',
        },
      ],
    };
    assert.deepEqual(lockFileContents, expectedLockFileContents);
    assert.strictEqual(
      fspReadFileMock.mock.calls[0].arguments[0],
      path.resolve(process.cwd(), 'pnpm-lock.yaml')
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 1);
  });

  void it('returns empty lock file contents when pnpm-lock.yaml is not present or parse-able', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );
    const lockFileContents =
      await pnpmLockFileReader.getLockFileContentsFromCwd();
    assert.deepEqual(lockFileContents, { dependencies: [] });
  });
});

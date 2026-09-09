import assert from 'assert';
import fsp from 'fs/promises';
import { beforeEach, describe, it, mock } from 'node:test';
import { createAmplifyDepUpdater } from './create_amplify_dep_updater.js';
import { EOL } from 'os';

void describe('createAmplifyDepUpdater', () => {
  const mockedFsReadFile = mock.method(fsp, 'readFile', () =>
    JSON.stringify({
      defaultDevPackages: [
        '@aws-amplify/backend',
        '@aws-amplify/backend-cli',
        'aws-cdk-lib@2.0.0',
        'constructs@^10.0.0',
        'typescript@^5.0.0',
        'tsx',
        'esbuild',
      ],
      defaultProdPackages: ['aws-amplify', 'test-prod-package@1.0.0'],
    }),
  );
  const mockedFsWriteFile = mock.method(fsp, 'writeFile', mock.fn());
  const ghContextMocked = {
    eventName: '',
    sha: '',
    ref: '',
    workflow: '',
    action: '',
    actor: '',
    job: '',
    runAttempt: 0,
    runNumber: 0,
    runId: 0,
    apiUrl: '',
    serverUrl: '',
    graphqlUrl: '',
    payload: {},
    issue: {
      owner: '',
      repo: '',
      number: 0,
    },
    repo: {
      owner: '',
      repo: '',
    },
  };

  beforeEach(() => {
    mockedFsReadFile.mock.resetCalls();
    mockedFsWriteFile.mock.resetCalls();
  });

  void it('successfully pins new dev version', async () => {
    await createAmplifyDepUpdater(
      [{ name: 'aws-cdk-lib', version: '2.1.0' }],
      undefined,
      ghContextMocked,
    );
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify(
        {
          defaultDevPackages: [
            '@aws-amplify/backend',
            '@aws-amplify/backend-cli',
            'aws-cdk-lib@2.1.0', // updated
            'constructs@^10.0.0',
            'typescript@^5.0.0',
            'tsx',
            'esbuild',
          ],
          defaultProdPackages: ['aws-amplify', 'test-prod-package@1.0.0'],
        },
        null,
        2,
      ),
    );
  });

  void it('successfully pins new prod version', async () => {
    await createAmplifyDepUpdater(
      [{ name: 'test-prod-package', version: '1.1.0' }],
      ['test-prod-package'],
      ghContextMocked,
    );
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify(
        {
          defaultDevPackages: [
            '@aws-amplify/backend',
            '@aws-amplify/backend-cli',
            'aws-cdk-lib@2.0.0',
            'constructs@^10.0.0',
            'typescript@^5.0.0',
            'tsx',
            'esbuild',
          ],
          defaultProdPackages: [
            'aws-amplify',
            'test-prod-package@1.1.0', // updated
          ],
        },
        null,
        2,
      ),
    );
  });

  void it('successfully pins multiple new versions', async () => {
    await createAmplifyDepUpdater(
      [
        { name: 'aws-cdk-lib', version: '2.1.0' },
        { name: 'test-prod-package', version: '1.1.0' },
      ],
      ['aws-cdk', 'aws-cdk-lib', 'test-prod-package'],
      ghContextMocked,
    );
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify(
        {
          defaultDevPackages: [
            '@aws-amplify/backend',
            '@aws-amplify/backend-cli',
            'aws-cdk-lib@2.1.0', // updated
            'constructs@^10.0.0',
            'typescript@^5.0.0',
            'tsx',
            'esbuild',
          ],
          defaultProdPackages: [
            'aws-amplify',
            'test-prod-package@1.1.0', // updated
          ],
        },
        null,
        2,
      ),
    );
  });

  void it('creates changeset file for dependabot pull request', async () => {
    const dependabotPRContext = {
      ...ghContextMocked,
      payload: {
        pull_request: {
          number: 1,
          body: 'Bumps aws-cdk-lib from 2.0.0 to 2.1.0',
          head: {
            ref: 'dependabot/test_version_update_branch',
            // eslint-disable-next-line spellcheck/spell-checker
            sha: 'abcd1234', // used for naming the changeset file
          },
        },
      },
    };
    const expectedChangesetContent = `---${EOL}'create-amplify': patch${EOL}---${EOL + EOL}bump create amplify dependencies${EOL}`;
    await createAmplifyDepUpdater(
      [{ name: 'aws-cdk-lib', version: '2.1.0' }],
      undefined,
      dependabotPRContext,
    );
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 2);
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[0].arguments[1],
      JSON.stringify(
        {
          defaultDevPackages: [
            '@aws-amplify/backend',
            '@aws-amplify/backend-cli',
            'aws-cdk-lib@2.1.0', // updated
            'constructs@^10.0.0',
            'typescript@^5.0.0',
            'tsx',
            'esbuild',
          ],
          defaultProdPackages: ['aws-amplify', 'test-prod-package@1.0.0'],
        },
        null,
        2,
      ),
    );
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[1].arguments[1],
      expectedChangesetContent,
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
    await createAmplifyDepUpdater(
      [
        { name: 'aws-cdk', version: '2.0.0' },
        { name: 'aws-cdk-lib', version: '2.0.0' },
      ],
      ['aws-cdk', 'aws-cdk-lib', 'test-prod-package'],
    );
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 0);
  });
});

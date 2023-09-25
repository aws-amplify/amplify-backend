import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';
import { SANDBOX_BRANCH } from './constants.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const testSecretName = 'testSecretName';
const testBackendId = 'testBackendId';

describe('sandbox secret remove command', () => {
  const secretClient = getSecretClient();
  const secretRemoveMock = mock.method(
    secretClient,
    'removeSecret',
    (): Promise<void> => Promise.resolve()
  );

  const sandboxIdResolver = new SandboxIdResolver({
    resolve: () => Promise.resolve('testBackendId'),
  });

  const sandboxSecretRemoveCmd = new SandboxSecretRemoveCommand(
    sandboxIdResolver,
    secretClient
  );

  const parser = yargs().command(
    sandboxSecretRemoveCmd as unknown as CommandModule
  );

  const commandRunner = new TestCommandRunner(parser);

  beforeEach(async () => {
    secretRemoveMock.mock.resetCalls();
  });

  it('remove a secret', async () => {
    await commandRunner.runCommand(`remove ${testSecretName}`);
    assert.equal(secretRemoveMock.mock.callCount(), 1);
    const backendIdentifier = secretRemoveMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.branchName, SANDBOX_BRANCH);
    assert.equal(secretRemoveMock.mock.calls[0].arguments[1], testSecretName);
  });

  it('show --help', async () => {
    const output = await commandRunner.runCommand('remove --help');
    assert.match(output, /Remove a sandbox secret/);
  });

  it('throws error if no secret name argument', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('remove'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments/);
        assert.match(err.output, /Not enough non-option arguments/);
        return true;
      }
    );
  });
});

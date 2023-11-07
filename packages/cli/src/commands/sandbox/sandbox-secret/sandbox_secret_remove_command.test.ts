import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { assertBackendIdDataEquivalence } from '../../../test-utils/assert_backend_id_data_equivalence.js';

const testSecretName = 'testSecretName';
const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

void describe('sandbox secret remove command', () => {
  const secretClient = getSecretClient();
  const secretRemoveMock = mock.method(
    secretClient,
    'removeSecret',
    (): Promise<void> => Promise.resolve()
  );

  const sandboxIdResolver: SandboxIdResolver = {
    resolve: () =>
      Promise.resolve(
        new SandboxBackendIdentifier(testBackendId, testSandboxName)
      ),
  } as SandboxIdResolver;

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

  void it('remove a secret', async () => {
    await commandRunner.runCommand(`remove ${testSecretName}`);
    assert.equal(secretRemoveMock.mock.callCount(), 1);
    const actualBackendId = secretRemoveMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assertBackendIdDataEquivalence(actualBackendId, {
      backendId: testBackendId,
      disambiguator: testSandboxName,
    });
    assert.equal(secretRemoveMock.mock.calls[0].arguments[1], testSecretName);
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('remove --help');
    assert.match(output, /Remove a sandbox secret/);
  });

  void it('throws error if no secret name argument', async () => {
    const output = await commandRunner.runCommand('remove');
    assert.match(output, /Not enough non-option arguments/);
  });
});

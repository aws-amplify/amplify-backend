import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';

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

  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: (identifier?: string) =>
      Promise.resolve({
        namespace: testBackendId,
        name: identifier || testSandboxName,
        type: 'sandbox',
      }),
  } as SandboxBackendIdResolver;

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
    assert.deepStrictEqual(secretRemoveMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: testBackendId,
        name: testSandboxName,
      },
      testSecretName,
    ]);
  });

  void it('removes secret from named sandbox', async () => {
    await commandRunner.runCommand(
      `remove ${testSecretName} --identifier anotherName`
    );
    assert.equal(secretRemoveMock.mock.callCount(), 1);
    assert.deepStrictEqual(secretRemoveMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: testBackendId,
        name: 'anotherName',
      },
      testSecretName,
    ]);
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

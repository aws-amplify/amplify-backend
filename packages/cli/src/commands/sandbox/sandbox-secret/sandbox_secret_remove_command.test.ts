import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';
import { SandboxSecretRemoveCommand } from './sandbox_secret_remove_command.js';
import { printer } from '@aws-amplify/cli-core';

const testSecretName = 'testSecretName';
const testSecretName2 = 'testSecretName2';
const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

void describe('sandbox secret remove command', () => {
  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secretRemoveMock = mock.method(
    secretClient,
    'removeSecret',
    (): Promise<void> => Promise.resolve(),
  );
  const secretsRemoveMock = mock.method(
    secretClient,
    'removeSecrets',
    (): Promise<void> => Promise.resolve(),
  );
  const listSecretsMock = mock.method(secretClient, 'listSecrets', () =>
    Promise.resolve([{ name: testSecretName }, { name: testSecretName2 }]),
  );
  const printMock = mock.method(printer, 'print');

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
    secretClient,
  );

  const parser = yargs().command(
    sandboxSecretRemoveCmd as unknown as CommandModule,
  );

  const commandRunner = new TestCommandRunner(parser);

  beforeEach(async () => {
    secretRemoveMock.mock.resetCalls();
    printMock.mock.resetCalls();
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
    assert.equal(
      printMock.mock.calls[0].arguments,
      `Successfully removed secret ${testSecretName}`,
    );
  });

  void it('removes secret from named sandbox', async () => {
    await commandRunner.runCommand(
      `remove ${testSecretName} --identifier anotherName`,
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

  void it('remove all secrets', async () => {
    await commandRunner.runCommand('remove --all');
    assert.equal(listSecretsMock.mock.callCount(), 1);
    assert.deepStrictEqual(listSecretsMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: testBackendId,
        name: testSandboxName,
      },
    ]);

    assert.equal(secretsRemoveMock.mock.callCount(), 1);
    assert.deepStrictEqual(secretsRemoveMock.mock.calls[0].arguments, [
      {
        type: 'sandbox',
        namespace: testBackendId,
        name: testSandboxName,
      },
      [testSecretName, testSecretName2],
    ]);
    assert.equal(
      printMock.mock.calls[0].arguments,
      'Successfully removed all secrets',
    );
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('remove --help');
    assert.match(output, /Remove a sandbox secret/);
  });

  void it('throws error if no secret name argument and all flag', async () => {
    const output = await commandRunner.runCommand(`remove`);
    [
      /Either secret-name or all flag must be provided/,
      /Provide either secret-name or all flag/,
    ].forEach((cmd) => assert.match(output, new RegExp(cmd)));
  });

  void it('throws error if both --all flag and secret-name argument', async () => {
    assert.match(
      await commandRunner.runCommand(`remove ${testSecretName} --all`),
      /Arguments all and secret-name are mutually exclusive/,
    );
  });
});

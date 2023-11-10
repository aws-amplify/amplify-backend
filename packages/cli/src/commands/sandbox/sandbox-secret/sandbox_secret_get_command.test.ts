import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import {
  Secret,
  SecretIdentifier,
  getSecretClient,
} from '@aws-amplify/backend-secret';
import { SandboxSecretGetCommand } from './sandbox_secret_get_command.js';
import { Printer } from '@aws-amplify/cli-core';

const testSecretName = 'testSecretName';
const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';
const testSecretIdentifier: SecretIdentifier = {
  name: testSecretName,
};
const testSecret: Secret = {
  ...testSecretIdentifier,
  version: 100,
  value: 'testValue',
};

void describe('sandbox secret get command', () => {
  const secretClient = getSecretClient();
  const secretGetMock = mock.method(
    secretClient,
    'getSecret',
    (): Promise<Secret | undefined> => Promise.resolve(testSecret)
  );

  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: () =>
      Promise.resolve({
        namespace: testBackendId,
        name: testSandboxName,
        type: 'sandbox',
      }),
  } as SandboxBackendIdResolver;

  const sandboxSecretGetCmd = new SandboxSecretGetCommand(
    sandboxIdResolver,
    secretClient
  );

  const parser = yargs().command(
    sandboxSecretGetCmd as unknown as CommandModule
  );

  const commandRunner = new TestCommandRunner(parser);

  beforeEach(async () => {
    secretGetMock.mock.resetCalls();
  });

  void it('gets a secret', async (contextual) => {
    const mockPrintRecord = contextual.mock.method(Printer, 'printRecord');

    await commandRunner.runCommand(`get ${testSecretName}`);

    assert.equal(secretGetMock.mock.callCount(), 1);
    assert.deepStrictEqual(secretGetMock.mock.calls[0].arguments, [
      {
        namespace: testBackendId,
        name: testSandboxName,
        type: 'sandbox',
      },
      testSecretIdentifier,
    ]);

    assert.equal(mockPrintRecord.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockPrintRecord.mock.calls[0].arguments[0],
      testSecret
    );
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /Get a sandbox secret/);
  });

  void it('throws error if no secret name argument', async () => {
    const output = await commandRunner.runCommand('get');
    assert.match(output, /Not enough non-option arguments/);
  });
});

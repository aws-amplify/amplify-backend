import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SecretIdentifier, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { Printer } from '../../printer/printer.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const testBackendId = 'testBackendId';

const testSecretIds: SecretIdentifier[] = [
  {
    name: 'testSecret1',
    version: 12,
  },
  {
    name: 'testSecret2',
    version: 24,
  },
];

void describe('sandbox secret list command', () => {
  const secretClient = getSecretClient();
  const secretListMock = mock.method(
    secretClient,
    'listSecrets',
    (): Promise<SecretIdentifier[] | undefined> =>
      Promise.resolve(testSecretIds)
  );
  const sandboxIdResolver = new SandboxIdResolver({
    resolve: () => Promise.resolve(testBackendId),
  });

  const sandboxSecretListCmd = new SandboxSecretListCommand(
    sandboxIdResolver,
    secretClient
  );

  const parser = yargs().command(sandboxSecretListCmd);
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(async () => {
    secretListMock.mock.resetCalls();
  });

  void it('list secrets', async (contextual) => {
    const mockPrintRecords = contextual.mock.method(Printer, 'printRecords');

    await commandRunner.runCommand(`list`);
    assert.equal(secretListMock.mock.callCount(), 1);

    const backendIdentifier = secretListMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.disambiguator, 'sandbox');

    assert.equal(mockPrintRecords.mock.callCount(), 1);
    assert.equal(mockPrintRecords.mock.calls[0].arguments[0], testSecretIds);
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /List all sandbox secrets/);
  });
});

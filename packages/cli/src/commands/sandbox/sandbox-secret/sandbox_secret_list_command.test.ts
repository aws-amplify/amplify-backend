import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { Secret, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { Printer } from '@aws-amplify/cli-core';

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

const testSecrets: Secret[] = [
  {
    name: 'testSecret1',
    value: 'val1',
  },
  {
    name: 'testSecret2',
    value: 'val2',
  },
];

void describe('sandbox secret list command', () => {
  const secretClient = getSecretClient();
  const secretListMock = mock.method(
    secretClient,
    'listSecrets',
    (): Promise<Secret[] | undefined> => Promise.resolve(testSecrets)
  );
  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: () =>
      Promise.resolve({
        namespace: testBackendId,
        name: testSandboxName,
        type: 'sandbox',
      }),
  } as SandboxBackendIdResolver;

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
    const mockPrintRecord = contextual.mock.method(Printer, 'printRecord');

    await commandRunner.runCommand(`list`);
    assert.equal(secretListMock.mock.callCount(), 1);

    assert.deepStrictEqual(secretListMock.mock.calls[0].arguments[0], {
      namespace: testBackendId,
      name: testSandboxName,
      type: 'sandbox',
    });

    assert.equal(mockPrintRecord.mock.callCount(), 1);
    assert.deepStrictEqual(mockPrintRecord.mock.calls[0].arguments[0], {
      names: testSecrets.map((s) => s.name),
    });
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /List all sandbox secrets/);
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { SecretListItem, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { format, printer } from '@aws-amplify/cli-core';

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

const testSecrets: SecretListItem[] = [
  {
    name: 'testSecret1',
  },
  {
    name: 'testSecret2',
  },
];
const printMock = mock.method(printer, 'print');

void describe('sandbox secret list command', () => {
  const listSecretsResponseMock = mock.fn<() => Promise<SecretListItem[]>>(
    async () => testSecrets
  );
  const secretClient = getSecretClient();
  const secretListMock = mock.method(
    secretClient,
    'listSecrets',
    listSecretsResponseMock
  );
  const sandboxIdResolver: SandboxBackendIdResolver = {
    resolve: (identifier?: string) =>
      Promise.resolve({
        namespace: testBackendId,
        name: identifier || testSandboxName,
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
    printMock.mock.resetCalls();
  });

  void it('list secrets', async () => {
    await commandRunner.runCommand('list');
    assert.equal(secretListMock.mock.callCount(), 1);

    assert.deepStrictEqual(secretListMock.mock.calls[0].arguments[0], {
      namespace: testBackendId,
      name: testSandboxName,
      type: 'sandbox',
    });

    assert.equal(printMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      printMock.mock.calls[0].arguments[0],
      format.list(testSecrets.map((s) => s.name))
    );
  });

  void it('lists secrets for named sandbox', async () => {
    await commandRunner.runCommand('list --identifier anotherName');
    assert.equal(secretListMock.mock.callCount(), 1);

    assert.deepStrictEqual(secretListMock.mock.calls[0].arguments[0], {
      namespace: testBackendId,
      name: 'anotherName',
      type: 'sandbox',
    });

    assert.equal(printMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      printMock.mock.calls[0].arguments[0],
      format.list(testSecrets.map((s) => s.name))
    );
  });

  void it('prints no secrets message if no secrets found', async () => {
    listSecretsResponseMock.mock.mockImplementationOnce(async () => []);
    await commandRunner.runCommand('list');
    assert.equal(secretListMock.mock.callCount(), 1);

    assert.deepStrictEqual(secretListMock.mock.calls[0].arguments[0], {
      namespace: testBackendId,
      name: testSandboxName,
      type: 'sandbox',
    });

    assert.equal(printMock.mock.callCount(), 1);
    assert.ok(
      printMock.mock.calls[0].arguments[0].startsWith(
        'No sandbox secrets found.'
      )
    );
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /List all sandbox secrets/);
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { Secret, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { Printer } from '@aws-amplify/cli-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { assertBackendIdDataEquivalence } from '../../../test-utils/assert_backend_id_data_equivalence.js';

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
  const sandboxIdResolver: SandboxIdResolver = {
    resolve: () =>
      Promise.resolve(
        new SandboxBackendIdentifier(testBackendId, testSandboxName)
      ),
  } as SandboxIdResolver;

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

    const actualBackendId = secretListMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assertBackendIdDataEquivalence(actualBackendId, {
      backendId: testBackendId,
      disambiguator: testSandboxName,
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

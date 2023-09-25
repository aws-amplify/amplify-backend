import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import {
  Secret,
  SecretIdentifier,
  getSecretClient,
} from '@aws-amplify/backend-secret';
import { SandboxSecretGetCommand } from './sandbox_secret_get_command.js';
import { SANDBOX_BRANCH } from './constants.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { Printer } from '../../printer/printer.js';

const testSecretName = 'testSecretName';
const testBackendId = 'testBackendId';
const testSecretIdentifier: SecretIdentifier = {
  name: testSecretName,
};
const testSecret: Secret = {
  ...testSecretIdentifier,
  version: 100,
  value: 'testValue',
};

describe('sandbox secret get command', () => {
  const secretClient = getSecretClient();
  const secretGetMock = mock.method(
    secretClient,
    'getSecret',
    (): Promise<Secret | undefined> => Promise.resolve(testSecret)
  );

  const sandboxIdResolver = new SandboxIdResolver({
    resolve: () => Promise.resolve(testBackendId),
  });

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

  it('gets a secret', async (contextual) => {
    const mockPrintRecord = contextual.mock.method(Printer, 'printRecord');

    await commandRunner.runCommand(`get ${testSecretName}`);

    assert.equal(secretGetMock.mock.callCount(), 1);
    const backendIdentifier = secretGetMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.branchName, SANDBOX_BRANCH);
    assert.deepStrictEqual(
      secretGetMock.mock.calls[0].arguments[1],
      testSecretIdentifier
    );

    assert.equal(mockPrintRecord.mock.callCount(), 1);
    assert.equal(mockPrintRecord.mock.calls[0].arguments[0], testSecret);
  });

  it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /Get a sandbox secret/);
  });

  it('throws error if no secret name argument', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('get'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments/);
        assert.match(err.output, /Not enough non-option arguments/);
        return true;
      }
    );
  });
});

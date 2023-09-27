import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SecretIdentifier, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretSetCommand } from './sandbox_secret_set_command.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-core';
import { Printer } from '../../printer/printer.js';

const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testSecretIdentifier: SecretIdentifier = {
  name: testSecretName,
  version: 100,
};

const testBackendId = 'testBackendId';

void describe('sandbox secret set command', () => {
  const secretClient = getSecretClient();
  const secretSetMock = mock.method(
    secretClient,
    'setSecret',
    (): Promise<SecretIdentifier> => Promise.resolve(testSecretIdentifier)
  );

  const sandboxIdResolver = new SandboxIdResolver({
    resolve: () => Promise.resolve(testBackendId),
  });

  const sandboxSecretSetCmd = new SandboxSecretSetCommand(
    sandboxIdResolver,
    secretClient
  );

  const parser = yargs().command(
    sandboxSecretSetCmd as unknown as CommandModule
  );

  const commandRunner = new TestCommandRunner(parser);

  beforeEach(async () => {
    secretSetMock.mock.resetCalls();
  });

  void it('sets a secret', async (contextual) => {
    const mockSecretValue = contextual.mock.method(
      AmplifyPrompter,
      'secretValue',
      () => Promise.resolve(testSecretValue)
    );

    const mockPrintRecord = contextual.mock.method(Printer, 'printRecord');

    await commandRunner.runCommand(`set ${testSecretName}`);
    assert.equal(mockSecretValue.mock.callCount(), 1);
    assert.equal(mockPrintRecord.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockPrintRecord.mock.calls[0].arguments[0],
      testSecretIdentifier
    );
    assert.equal(secretSetMock.mock.callCount(), 1);

    const backendIdentifier = secretSetMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.disambiguator, SANDBOX_BRANCH);
    assert.equal(secretSetMock.mock.calls[0].arguments[1], testSecretName);
    assert.equal(secretSetMock.mock.calls[0].arguments[2], testSecretValue);
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('set --help');
    assert.match(output, /Set a sandbox secret/);
  });

  void it('throws error if no secret name argument', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('set'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments/);
        assert.match(err.output, /Not enough non-option arguments/);
        return true;
      }
    );
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SecretIdentifier, getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretSetCommand } from './sandbox_secret_set_command.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testSecretIdentifier: SecretIdentifier = {
  name: testSecretName,
  version: 100,
};

const testBackendId = 'testBackendId';
const testSandboxName = 'testSandboxName';

void describe('sandbox secret set command', () => {
  const secretClient = getSecretClient();
  const secretSetMock = mock.method(
    secretClient,
    'setSecret',
    (): Promise<SecretIdentifier> => Promise.resolve(testSecretIdentifier)
  );

  const sandboxIdResolver: SandboxIdResolver = {
    resolve: () =>
      Promise.resolve(
        new SandboxBackendIdentifier(testBackendId, testSandboxName)
      ),
  } as SandboxIdResolver;

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

    await commandRunner.runCommand(`set ${testSecretName}`);
    assert.equal(mockSecretValue.mock.callCount(), 1);
    assert.equal(secretSetMock.mock.callCount(), 1);

    const backendIdentifier = secretSetMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.equal(backendIdentifier.backendId, testBackendId);
    assert.equal(backendIdentifier.disambiguator, testSandboxName);
    assert.equal(secretSetMock.mock.calls[0].arguments[1], testSecretName);
    assert.equal(secretSetMock.mock.calls[0].arguments[2], testSecretValue);
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('set --help');
    assert.match(output, /Set a sandbox secret/);
  });

  void it('throws error if no secret name argument', async () => {
    const output = await commandRunner.runCommand('set');
    assert.match(output, /Not enough non-option arguments/);
  });
});

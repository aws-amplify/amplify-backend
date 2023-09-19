import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { SecretIdentifier, getSecretClient } from '@aws-amplify/backend-secret';
import { SANDBOX_BRANCH } from './constants.js';
import { SandboxSecretListCommand } from './sandbox_secret_list_command.js';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const testBackendId = 'testBackendId';

describe('sandbox secret list command', () => {
  let commandRunner: TestCommandRunner;
  let secretListMock =
    mock.fn<
      (
        backendId: UniqueBackendIdentifier | BackendId,
        branchName?: string
      ) => Promise<SecretIdentifier[] | undefined>
    >();

  beforeEach(async () => {
    const secretClient = getSecretClient();

    secretListMock = mock.method(
      secretClient,
      'listSecrets',
      (): Promise<SecretIdentifier[] | undefined> => Promise.resolve([])
    );
    const sandboxIdResolver = new SandboxIdResolver({
      resolve: () => Promise.resolve(testBackendId),
    });

    const sandboxSecretListCmd = new SandboxSecretListCommand(
      sandboxIdResolver,
      secretClient
    );

    const parser = yargs().command(sandboxSecretListCmd);
    commandRunner = new TestCommandRunner(parser);
    secretListMock.mock.resetCalls();
  });

  it('list secrets', async () => {
    await commandRunner.runCommand(`list`);
    assert.equal(secretListMock.mock.callCount(), 1);

    const backendIdentifier = secretListMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.branchName, SANDBOX_BRANCH);
  });

  it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /List all sandbox secrets/);
  });
});

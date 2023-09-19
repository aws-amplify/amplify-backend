import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';
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
import { SANDBOX_BRANCH } from './constants.js';
import { SandboxSecretSetCommand } from './sandbox_secret_set_command.js';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testBackendId = 'testBackendId';

describe('sandbox secret set command', () => {
  let commandRunner: TestCommandRunner;
  let secretSetMock =
    mock.fn<
      (
        backendId: UniqueBackendIdentifier | BackendId,
        secretName: string,
        secretValue: string
      ) => Promise<SecretIdentifier>
    >();

  beforeEach(async () => {
    const secretClient = getSecretClient();

    secretSetMock = mock.method(
      secretClient,
      'setSecret',
      (): Promise<SecretIdentifier> => Promise.resolve({} as SecretIdentifier)
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
    commandRunner = new TestCommandRunner(parser);
    secretSetMock.mock.resetCalls();
  });

  it('sets a secret', async (contextual) => {
    contextual.mock.method(AmplifyPrompter, 'nonEmptySecretValue', () =>
      Promise.resolve(testSecretValue)
    );

    await commandRunner.runCommand(`set ${testSecretName}`);
    assert.equal(secretSetMock.mock.callCount(), 1);
    const backendIdentifier = secretSetMock.mock.calls[0]
      .arguments[0] as UniqueBackendIdentifier;
    assert.match(backendIdentifier.backendId, new RegExp(testBackendId));
    assert.equal(backendIdentifier.branchName, SANDBOX_BRANCH);
    assert.equal(secretSetMock.mock.calls[0].arguments[1], testSecretName);
    assert.equal(secretSetMock.mock.calls[0].arguments[2], testSecretValue);
  });

  it('show --help', async () => {
    const output = await commandRunner.runCommand('list --help');
    assert.match(output, /Set a sandbox secret/);
  });

  it('throws error if no secret name argument', async () => {
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

import { beforeEach, describe, it } from 'node:test';
import yargs from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretCommand } from './sandbox_secret_command.js';

const testBackendId = 'testBackendId';

describe('sandbox secret list command', () => {
  let commandRunner: TestCommandRunner;

  beforeEach(async () => {
    const secretClient = getSecretClient();
    const sandboxIdResolver = new SandboxIdResolver({
      resolve: () => Promise.resolve(testBackendId),
    });

    const sandboxSecretCmd = new SandboxSecretCommand(
      sandboxIdResolver,
      secretClient
    );

    const parser = yargs().command(sandboxSecretCmd);
    commandRunner = new TestCommandRunner(parser);
  });

  it('show --help', async () => {
    const output = await commandRunner.runCommand('secret --help');
    assert.match(output, /Manage sandbox secret/);
    ['secret set', 'secret remove', 'secret get ', 'secret list'].forEach(
      (cmd) => assert.match(output, new RegExp(cmd))
    );
  });

  it('throws error if no verb subcommand', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('secret'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments/);
        assert.match(err.output, /Not enough non-option arguments/);
        return true;
      }
    );
  });
});

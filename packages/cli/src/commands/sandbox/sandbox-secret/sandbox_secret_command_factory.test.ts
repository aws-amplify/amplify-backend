import { beforeEach, describe, it } from 'node:test';
import yargs from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { createSandboxSecretCommand } from './sandbox_secret_command_factory.js';

describe('sandbox secret command factory', () => {
  let commandRunner: TestCommandRunner;

  beforeEach(async () => {
    const sandboxSecretCmd = createSandboxSecretCommand();

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

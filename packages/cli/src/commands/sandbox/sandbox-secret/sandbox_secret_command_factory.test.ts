import { describe, it } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { createSandboxSecretCommand } from './sandbox_secret_command_factory.js';

void describe('sandbox secret command factory', () => {
  const sandboxSecretCmd = createSandboxSecretCommand();

  const parser = yargs().command(sandboxSecretCmd);
  const commandRunner = new TestCommandRunner(parser);

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('secret --help');
    assert.match(output, /Manage sandbox secret/);
    ['secret set', 'secret remove', 'secret get ', 'secret list'].forEach(
      (cmd) => assert.match(output, new RegExp(cmd))
    );
  });

  void it('throws error if no verb subcommand', async () => {
    const output = await commandRunner.runCommand('secret');
    assert.match(output, /Not enough non-option arguments/);
  });
});

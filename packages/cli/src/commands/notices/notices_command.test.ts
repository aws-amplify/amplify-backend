import { describe, it } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';

import { createNoticesCommand } from './notices_command_factory.js';

void describe('notices command', () => {
  const noticesCommand = createNoticesCommand();

  const parser = yargs().command(noticesCommand);
  const commandRunner = new TestCommandRunner(parser);

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('notices --help');
    assert.match(
      output,
      /Manage and interact with Amplify backend tooling notices/,
    );
    ['notices list', 'notices acknowledge'].forEach((cmd) =>
      assert.match(output, new RegExp(cmd)),
    );
  });

  void it('throws error if no verb subcommand', async () => {
    const output = await commandRunner.runCommand('notices');
    assert.match(output, /Not enough non-option arguments/);
  });
});

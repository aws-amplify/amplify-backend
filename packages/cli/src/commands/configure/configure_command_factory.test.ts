import { describe, it } from 'node:test';
import yargs from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import { createConfigureCommand } from './configure_command_factory.js';

void describe('configure command factory', () => {
  const configureCmd = createConfigureCommand();

  const parser = yargs().command(configureCmd);
  const commandRunner = new TestCommandRunner(parser);

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('configure --help');
    assert.match(output, /Configure AWS Amplify/);
    ['configure profile'].forEach((cmd) =>
      assert.match(output, new RegExp(cmd))
    );
  });

  void it('throws error if no verb subcommand', async () => {
    const output = await commandRunner.runCommand('configure');
    assert.match(output, /Not enough non-option arguments/);
  });
});

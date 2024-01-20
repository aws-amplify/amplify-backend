import { describe, it } from 'node:test';
import { createInfoCommand } from './info_command_factory.js';
import { InfoCommand } from './info_command.js';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import yargs from 'yargs';

void describe('createInfoCommand', () => {
  void it('should return an instance of InfoCommand', () => {
    const result = createInfoCommand();
    assert.ok(result instanceof InfoCommand);
  });
});

void describe('info command run', () => {
  const command = new InfoCommand();
  const parser = yargs().command(command);
  const commandRunner = new TestCommandRunner(parser);

  void it('includes info subcommands in help output', async () => {
    const output = await commandRunner.runCommand(['info', '--help']);
    assert.match(
      output,
      /info\W*Generates information for Amplify troubleshooting/
    );
  });
});

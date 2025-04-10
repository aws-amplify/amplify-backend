import yargs from 'yargs';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import { createGenerateCommand } from './generate_command_factory.js';

/**
 * Top level generate command's responsibility is to wire subcommands and delegate execution down the command chain.
 * Therefore, testing primarily focuses on help output.
 */
void describe('top level generate command', () => {
  const generateCommand = createGenerateCommand();
  const parser = yargs().command(generateCommand);
  const commandRunner = new TestCommandRunner(parser);

  void it('includes generate subcommands in help output', async () => {
    const output = await commandRunner.runCommand('generate --help');
    assert.match(output, /Commands:/);
    assert.match(
      output,
      /generate outputs\W*Generates Amplify backend outputs/,
    );
    assert.match(
      output,
      /generate graphql-client-code\W*Generates graphql API code/,
    );
  });

  void it('fails if subcommand is not provided', async () => {
    const output = await commandRunner.runCommand('generate');
    assert.match(output, /Not enough non-option arguments/);
  });

  void it('fails if stack argument provided is invalid', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('generate outputs --stack 3-Invalid'),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.strictEqual(
          error.error.message,
          'Invalid --stack name provided: 3-Invalid',
        );
        return true;
      },
    );
  });

  void it('should throw if top level command handler is ever called', () => {
    assert.throws(
      () => generateCommand.handler({ $0: '', _: [] }),
      (err: Error) => {
        assert.equal(
          err.message,
          'Top level generate handler should never be called',
        );
        return true;
      },
    );
  });
});

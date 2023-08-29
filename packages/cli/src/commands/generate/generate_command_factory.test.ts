import { describe, it } from 'node:test';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import { createGenerateCommand } from './generate_command_factory.js';
import yargs from 'yargs';
import assert from 'node:assert';

/**
 * Top level generate command's responsibility is to wire subcommands and delegate execution down the command chain.
 * Therefore, testing primarily focuses on help output.
 */
describe('top level generate command', () => {
  const generateCommand = createGenerateCommand();
  const parser = yargs().command(generateCommand);
  const commandRunner = new TestCommandRunner(parser);

  it('includes generate config in help output', async () => {
    const output = await commandRunner.runCommand('generate --help');
    assert.match(output, /Commands:/);
    assert.match(output, /generate config {2}Generates client config/);
  });

  it('fails if subcommand is not provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('generate'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments:/);
        assert.match(err.output, /Commands:/);
        assert.match(err.output, /Not enough non-option arguments:/);
        return true;
      }
    );
  });

  it('should throw if top level command handler is ever called', () => {
    assert.throws(
      () => generateCommand.handler({ $0: '', _: [] }),
      (err: Error) => {
        assert.equal(
          err.message,
          'Top level generate handler should never be called'
        );
        return true;
      }
    );
  });
});

import { describe, it } from 'node:test';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import { createConfigureCommand } from './configure_command_factory.js';
import yargs from 'yargs';
import assert from 'node:assert';

/**
 * Top level generate command's responsibility is to wire subcommands and delegate execution down the command chain.
 * Therefore, testing primarily focuses on help output.
 */
void describe('top level generate command', () => {
  const configureCommand = createConfigureCommand();
  const parser = yargs().command(configureCommand);
  const commandRunner = new TestCommandRunner(parser);

  void it('includes configure subcommands in help output', async () => {
    const output = await commandRunner.runCommand('configure --help');
    assert.match(output, /Commands:/);
    assert.match(output, /configure profile\W*Configures local AWS profile/);
    assert.match(output, /amplify configure\W*Configuration management/);
  });

  void it('fails if subcommand is not provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('configure'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments:/);
        assert.match(err.output, /Commands:/);
        assert.match(err.output, /Not enough non-option arguments:/);
        return true;
      }
    );
  });

  void it('should throw if top level command handler is ever called', () => {
    assert.throws(
      () => configureCommand.handler({ $0: '', _: [] }),
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

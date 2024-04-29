import { afterEach, describe, it } from 'node:test';
import { verifyCommandName } from './verify_command_name.js';
import assert from 'node:assert';

void describe('verifyCommandName', () => {
  const originalProcessArgv = process.argv;
  afterEach(() => {
    process.argv = originalProcessArgv;
  });
  void it('is a noop when the command name is ampx', () => {
    process.argv[1] = 'some/path/ampx.js';
    verifyCommandName();
    // if we get here then the validator completed without error
  });

  void it('throws an error when the command name is not ampx', () => {
    process.argv[1] = 'some/path/amplify.js';
    assert.throws(
      () => verifyCommandName(),
      (error: Error) =>
        error.name === 'InvalidCommandError' &&
        error.message.startsWith('The Amplify Gen 2 CLI has been renamed')
    );
  });
});

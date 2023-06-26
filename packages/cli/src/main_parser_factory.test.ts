import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TestCommandError,
  TestCommandRunner,
} from './test_utils/command_runner.js';
import { createMainParser } from './main_parser_factory.js';

describe('main parser', { concurrency: false }, () => {
  const parser = createMainParser();
  const commandRunner = new TestCommandRunner(parser);

  it('includes create command in help output', async () => {
    const output = await commandRunner.runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(output, /create {2}Creates a new Amplify backend/);
  });

  it('fails if command is not provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand(''),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments:/);
        assert.match(err.output, /Commands:/);
        assert.match(err.output, /Not enough non-option arguments:/);
        return true;
      }
    );
  });
});

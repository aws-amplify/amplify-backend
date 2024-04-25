import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TestCommandRunner } from './test-utils/command_runner.js';
import { createMainParser } from './main_parser_factory.js';
import { version } from '#package.json';

void describe('main parser', { concurrency: false }, () => {
  const parser = createMainParser(version);
  const commandRunner = new TestCommandRunner(parser);

  void it('includes generate command in help output', async () => {
    const output = await commandRunner.runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(output, /generate\s+Generates post deployment artifacts/);
  });

  void it('shows version', async () => {
    const output = await commandRunner.runCommand('--version');
    assert.equal(output, `${version}\n`);
  });

  void it('prints help if command is not provided', async () => {
    const output = await commandRunner.runCommand('');
    assert.match(output, /Commands:/);
    assert.match(output, /Not enough non-option arguments:/);
  });

  void it('errors and prints help if invalid option is given', async () => {
    const output = await commandRunner.runCommand(
      'sandbox --non-existing-option 1'
    );
    assert.match(output, /Commands:/);
    assert.match(output, /Unknown arguments: non-existing-option/);
  });
});

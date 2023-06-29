import { beforeEach, describe, it, mock } from 'node:test';

import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test_utils/command_runner.js';
import assert from 'node:assert';
import fs from 'fs';
import { Sandbox } from '@aws-amplify/sandbox';
import { SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';

describe('sandbox command factory', () => {
  it('instantiate a sandbox command correctly', () => {
    assert.ok(createSandboxCommand() instanceof SandboxCommand);
  });
});

describe('sandbox command', () => {
  const sandboxStartMock = mock.method(Sandbox.prototype, 'start', () => {
    return Promise.resolve();
  });

  const sandboxCommand = new SandboxCommand();
  const parser = yargs().command(sandboxCommand as unknown as CommandModule);
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    sandboxStartMock.mock.resetCalls();
  });

  it('starts sandbox without any additional flags', async () => {
    await commandRunner.runCommand('sandbox');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox --help');
    assert.match(output, /--dir/);
    assert.match(output, /--exclude/);
  });

  it('fails if invalid dir is provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir nonExistentDir'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'Error');
        assert.equal(err.error.message, '--dir nonExistentDir does not exist');
        assert.match(err.output, /--dir nonExistentDir does not exist/);
        return true;
      }
    );
  });

  it('fails if a file is provided in the --dir flag', async (contextual) => {
    contextual.mock.method(fs, 'statSync', () => {
      return { isDirectory: () => false };
    });
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir existentFile'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'Error');
        assert.equal(
          err.error.message,
          '--dir existentFile is not a valid directory'
        );
        assert.match(err.output, /--dir existentFile is not a valid directory/);
        return true;
      }
    );
  });
});

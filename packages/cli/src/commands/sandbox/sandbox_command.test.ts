import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test_utils/command_runner.js';
import assert from 'node:assert';
import fs from 'fs';
import { sandbox } from '@aws-amplify/sandbox';
import { SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';

describe('sandbox command factory', () => {
  it('instantiate a sandbox command correctly', () => {
    assert.ok(createSandboxCommand() instanceof SandboxCommand);
  });
});

describe('sandbox command', () => {
  const sandboxStartMock = mock.method(sandbox, 'start', () => {
    return Promise.resolve();
  });
  const sandboxDeleteCommand = new SandboxDeleteCommand(sandbox);

  const sandboxCommand = new SandboxCommand(sandbox, sandboxDeleteCommand);
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
    assert.match(output, /--dirToWatch/);
    assert.match(output, /--exclude/);
  });

  it('fails if invalid dirToWatch is provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dirToWatch nonExistentDir'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'Error');
        assert.equal(
          err.error.message,
          '--dirToWatch nonExistentDir does not exist'
        );
        assert.match(err.output, /--dirToWatch nonExistentDir does not exist/);
        return true;
      }
    );
  });

  it('fails if a file is provided in the --dirToWatch flag', async (contextual) => {
    contextual.mock.method(fs, 'statSync', () => {
      return { isDirectory: () => false };
    });
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dirToWatch existentFile'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'Error');
        assert.equal(
          err.error.message,
          '--dirToWatch existentFile is not a valid directory'
        );
        assert.match(
          err.output,
          /--dirToWatch existentFile is not a valid directory/
        );
        return true;
      }
    );
  });

  it('asks to delete the sandbox environment when users send ctrl-C and say yes to delete', async (contextual) => {
    // Mock process and extract the sigint handler
    const processSignal = contextual.mock.method(process, 'on', () => {
      /* no op */
    });
    let sigIntHandlerFn;
    const sandboxStartMock = contextual.mock.method(
      sandbox,
      'start',
      async () => {
        sigIntHandlerFn = processSignal.mock.calls[0].arguments[1];
        if (sigIntHandlerFn) sigIntHandlerFn();
        return Promise.resolve();
      }
    );

    const sandboxDeleteMock = contextual.mock.method(
      sandbox,
      'delete',
      async () => {
        return Promise.resolve();
      }
    );

    // User said yes to delete
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () => {
      return Promise.resolve(true);
    });
    await commandRunner.runCommand('sandbox');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
  });

  it('asks to delete the sandbox environment when users send ctrl-C and say no to delete', async (contextual) => {
    // Mock process and extract the sigint handler
    const processSignal = contextual.mock.method(process, 'on', () => {
      /* no op */
    });
    let sigIntHandlerFn;
    const sandboxStartMock = contextual.mock.method(
      sandbox,
      'start',
      async () => {
        sigIntHandlerFn = processSignal.mock.calls[0].arguments[1];
        if (sigIntHandlerFn) sigIntHandlerFn();
        return Promise.resolve();
      }
    );

    const sandboxDeleteMock = contextual.mock.method(
      sandbox,
      'delete',
      async () => {
        return Promise.resolve();
      }
    );

    // User said no to delete
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () => {
      return Promise.resolve(false);
    });
    await commandRunner.runCommand('sandbox');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(sandboxDeleteMock.mock.callCount(), 0);
  });
});

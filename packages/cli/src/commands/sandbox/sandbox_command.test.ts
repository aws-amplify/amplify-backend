import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '../prompter/amplify_prompts.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import fs from 'fs';
import { SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { Sandbox, SandboxSingletonFactory } from '@aws-amplify/sandbox';

describe('sandbox command factory', () => {
  it('instantiate a sandbox command correctly', () => {
    assert.ok(createSandboxCommand() instanceof SandboxCommand);
  });
});

describe('sandbox command', () => {
  let commandRunner: TestCommandRunner;
  let sandbox: Sandbox;
  let sandboxStartMock = mock.fn<typeof sandbox.start>();

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(() =>
      Promise.resolve('testBackendId')
    );
    sandbox = await sandboxFactory.getInstance();

    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());
    const sandboxDeleteCommand = new SandboxDeleteCommand(sandboxFactory);

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      sandboxDeleteCommand
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    sandboxStartMock.mock.resetCalls();
  });

  it('starts sandbox without any additional flags', async () => {
    await commandRunner.runCommand('sandbox');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.ok(!sandboxStartMock.mock.calls[0].arguments[0].name);
  });

  it('starts sandbox with user provided app name', async () => {
    await commandRunner.runCommand('sandbox --name user-app-name');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].name,
      'user-app-name'
    );
  });

  it('starts sandbox with user provided output directory for client config', async () => {
    await commandRunner.runCommand('sandbox --out test/location.js');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].clientConfigFilePath,
      'test/location.js'
    );
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox --help');
    assert.match(output, /--name/);
    assert.match(output, /--dirToWatch/);
    assert.match(output, /--exclude/);
    assert.match(output, /--format/);
    assert.match(output, /--out/);
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
    contextual.mock.method(fs, 'statSync', () => ({
      isDirectory: () => false,
    }));
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
    // Mock process and extract the sigint handler after calling the sandbox command
    const processSignal = contextual.mock.method(process, 'on', () => {
      /* no op */
    });
    const sandboxStartMock = contextual.mock.method(
      sandbox,
      'start',
      async () => Promise.resolve()
    );

    const sandboxDeleteMock = contextual.mock.method(sandbox, 'delete', () =>
      Promise.resolve()
    );

    // User said yes to delete
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(true)
    );

    await commandRunner.runCommand('sandbox');

    // Similar to the later 0ms timeout. Without this tests in github action are failing
    // but working locally
    await new Promise((resolve) => setTimeout(resolve, 0));
    const sigIntHandlerFn = processSignal.mock.calls[0].arguments[1];
    if (sigIntHandlerFn) sigIntHandlerFn();

    // I can't find any open node:test or yargs issues that would explain why this is necessary
    // but for some reason the mock call count does not update without this 0ms wait
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(sandboxDeleteMock.mock.callCount(), 1);
  });

  it('asks to delete the sandbox environment when users send ctrl-C and say no to delete', async (contextual) => {
    // Mock process and extract the sigint handler after calling the sandbox command
    const processSignal = contextual.mock.method(process, 'on', () => {
      /* no op */
    });
    const sandboxStartMock = contextual.mock.method(
      sandbox,
      'start',
      async () => Promise.resolve()
    );

    const sandboxDeleteMock = contextual.mock.method(
      sandbox,
      'delete',
      async () => Promise.resolve()
    );

    // User said no to delete
    contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
      Promise.resolve(false)
    );

    await commandRunner.runCommand('sandbox');

    // Similar to the previous test's 0ms timeout. Without this tests in github action are failing
    // but working locally
    await new Promise((resolve) => setTimeout(resolve, 0));
    const sigIntHandlerFn = processSignal.mock.calls[0].arguments[1];
    if (sigIntHandlerFn) sigIntHandlerFn();

    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(sandboxDeleteMock.mock.callCount(), 0);
  });
});

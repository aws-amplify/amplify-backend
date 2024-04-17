import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import fs from 'fs';
import fsp from 'fs/promises';
import { EventHandler, SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { Sandbox, SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { CommandMiddleware } from '../../command_middleware.js';
import path from 'path';

mock.method(fsp, 'mkdir', () => Promise.resolve());

// To check if client config already exists before creating an empty one.
mock.method(fs, 'existsSync', () => true);

void describe('sandbox command factory', () => {
  void it('instantiate a sandbox command correctly', () => {
    assert.ok(createSandboxCommand() instanceof SandboxCommand);
  });
});

void describe('sandbox command', () => {
  let commandRunner: TestCommandRunner;
  let sandbox: Sandbox;
  let sandboxStartMock = mock.fn<typeof sandbox.start>();

  const clientConfigGenerationMock = mock.fn<EventHandler>();
  const clientConfigDeletionMock = mock.fn<EventHandler>();

  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: clientConfigGenerationMock,
  } as unknown as ClientConfigGeneratorAdapter;

  const commandMiddleware = new CommandMiddleware(printer);
  const mockHandleProfile = mock.method(
    commandMiddleware,
    'ensureAwsCredentialAndRegion',
    () => null
  );
  const sandboxProfile = 'test-sandbox';

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(
      () =>
        Promise.resolve({
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        }),
      printer
    );
    sandbox = await sandboxFactory.getInstance();

    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());
    const sandboxDeleteCommand = new SandboxDeleteCommand(sandboxFactory);

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [sandboxDeleteCommand, createSandboxSecretCommand()],
      clientConfigGeneratorAdapterMock,
      commandMiddleware,
      () => ({
        successfulDeployment: [clientConfigGenerationMock],
        successfulDeletion: [clientConfigDeletionMock],
        failedDeployment: [],
      })
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    sandboxStartMock.mock.resetCalls();
    mockHandleProfile.mock.resetCalls();
  });

  void it('registers a callback on the "successfulDeployment" event', async () => {
    const mockOn = mock.method(sandbox, 'on');
    await commandRunner.runCommand('sandbox');
    assert.equal(mockOn.mock.calls[0].arguments[0], 'successfulDeployment');
    assert.equal(mockOn.mock.calls[0].arguments[1], clientConfigGenerationMock);
  });

  void it('registers a callback on the "successfulDeletion" event', async () => {
    const mockOn = mock.method(sandbox, 'on');
    await commandRunner.runCommand('sandbox');
    assert.equal(mockOn.mock.calls[1].arguments[0], 'successfulDeletion');
    assert.equal(mockOn.mock.calls[1].arguments[1], clientConfigDeletionMock);
  });

  void it('starts sandbox without any additional flags', async () => {
    await commandRunner.runCommand('sandbox');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.ok(!sandboxStartMock.mock.calls[0].arguments[0].identifier);
  });

  void it('starts sandbox with user provided sandbox identifier', async () => {
    await commandRunner.runCommand('sandbox --identifier user-app-name');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].identifier,
      'user-app-name'
    );
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox --help');
    assert.match(output, /--identifier/);
    assert.match(output, /--dir-to-watch/);
    assert.match(output, /--exclude/);
    assert.match(output, /--config-format/);
    assert.match(output, /--config-out-dir/);
    assert.match(output, /--once/);
    assert.equal(mockHandleProfile.mock.callCount(), 0);
  });

  void it('shows version should not call profile middleware', async () => {
    void commandRunner.runCommand('sandbox --version');
    assert.equal(mockHandleProfile.mock.callCount(), 0);
  });

  void it('fails if invalid dir-to-watch is provided', async () => {
    const dirToWatchError = new Error(
      '--dir-to-watch nonExistentDir does not exist'
    );
    mock.method(fsp, 'stat', () => Promise.reject(dirToWatchError));
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir-to-watch nonExistentDir'),
      (err: TestCommandError) => {
        assert.equal(err.error.message, dirToWatchError.message);
        return true;
      }
    );
  });

  void it('fails if a file is provided in the --dir-to-watch flag', async (contextual) => {
    const dirToWatchError = new Error(
      '--dir-to-watch existentFile is not a valid directory'
    );
    contextual.mock.method(fsp, 'stat', () => ({
      isDirectory: () => false,
    }));
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir-to-watch existentFile'),
      (err: TestCommandError) => {
        assert.equal(err.error.message, dirToWatchError.message);
        return true;
      }
    );
  });

  void it('asks to delete the sandbox environment when users send ctrl-C and say yes to delete', async (contextual) => {
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

  void it('asks to delete the sandbox environment when users send ctrl-C and say no to delete', async (contextual) => {
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

  void it('starts sandbox with user provided invalid AWS profile', async () => {
    const profileErr = new Error('some profile error');
    mockHandleProfile.mock.mockImplementationOnce(() => {
      throw profileErr;
    });
    await assert.rejects(
      () => commandRunner.runCommand(`sandbox --profile ${sandboxProfile}`), // profile doesn't exist
      (err: TestCommandError) => {
        assert.equal(err.error, profileErr);
        return true;
      }
    );
    assert.equal(sandboxStartMock.mock.callCount(), 0);
    assert.equal(mockHandleProfile.mock.callCount(), 1);
    assert.equal(
      mockHandleProfile.mock.calls[0].arguments[0]?.profile,
      sandboxProfile
    );
  });

  void it('starts sandbox with user provided valid AWS profile', async () => {
    mockHandleProfile.mock.mockImplementationOnce(() => null);
    const sandboxFactory = new SandboxSingletonFactory(
      () =>
        Promise.resolve({
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        }),
      printer
    );
    sandbox = await sandboxFactory.getInstance();
    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [],
      clientConfigGeneratorAdapterMock,
      commandMiddleware,
      undefined
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    await commandRunner.runCommand(`sandbox --profile ${sandboxProfile}`);
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(
      mockHandleProfile.mock.calls[0].arguments[0]?.profile,
      sandboxProfile
    );
  });

  void it('starts sandbox if a value containing "." is provided for config-out-dir', async () => {
    // this is a valid case to maintain consistency with behaviors of amplify generate graphql-client-code/forms
    await commandRunner.runCommand(
      'sandbox --config-out-dir existentFile.json'
    );
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].exclude,
      [
        path.join(
          process.cwd(),
          'existentFile.json',
          'amplifyconfiguration.json'
        ),
      ]
    );
  });

  void it('starts sandbox with provided client config options as watch exclusions', async (contextual) => {
    contextual.mock.method(fsp, 'stat', () => ({
      isDirectory: () => true,
    }));
    await commandRunner.runCommand(
      'sandbox --config-out-dir existentDir --config-format ts'
    );
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].exclude,
      [path.join(process.cwd(), 'existentDir', 'amplifyconfiguration.ts')]
    );
  });

  void it('sandbox creates an empty client config file if one does not already exist for version 0', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => false);
    const writeFileMock = contextual.mock.method(fsp, 'writeFile', () => true);
    await commandRunner.runCommand('sandbox --config-version 0');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(writeFileMock.mock.calls[0].arguments[1], '{}');
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'amplifyconfiguration.json')
    );
  });

  void it('sandbox creates an empty client config file if one does not already exist for version 1', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => false);
    const writeFileMock = contextual.mock.method(fsp, 'writeFile', () => true);
    await commandRunner.runCommand('sandbox --config-version 1');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[1],
      `{\n  "version": "1"\n}`
    );
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'amplify_outputs.json')
    );
  });

  void it('starts sandbox with watchForChanges when --once flag is set', async () => {
    await commandRunner.runCommand('sandbox --once');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.strictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].watchForChanges,
      false
    );
  });

  void it('--once flag is mutually exclusive with dir-to-watch & exclude', async () => {
    assert.match(
      await commandRunner.runCommand(
        'sandbox --once --dir-to-watch nonExistentDir'
      ),
      /Arguments once and dir-to-watch are mutually exclusive/
    );
    assert.match(
      await commandRunner.runCommand('sandbox --once --exclude test'),
      /Arguments once and exclude are mutually exclusive/
    );
  });
});

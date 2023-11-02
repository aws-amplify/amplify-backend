import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import fs from 'fs';
import fsAsync from 'fs/promises';
import { EventHandler, SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import { Sandbox, SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import path from 'path';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';
import { EOL } from 'node:os';

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

  const sandboxProfile = 'amplify-sandbox';
  let testDir: string;
  let credFilePath: string;
  before(async () => {
    testDir = await fsAsync.mkdtemp('amplify_sandbox_test');
    credFilePath = path.join(process.cwd(), testDir, 'credentials');

    const defaultCredData = `[${DEFAULT_PROFILE}]${EOL}aws_access_key_id = 111${EOL}aws_secret_access_key = 222${EOL}`;
    await fsAsync.writeFile(credFilePath, defaultCredData, 'utf-8');
    process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
  });

  after(async () => {
    await fsAsync.rm(testDir, { recursive: true, force: true });
    delete process.env.AWS_SHARED_CREDENTIALS_FILE;
  });

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(() =>
      Promise.resolve('testBackendId')
    );
    sandbox = await sandboxFactory.getInstance();

    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());
    const sandboxDeleteCommand = new SandboxDeleteCommand(sandboxFactory);

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [sandboxDeleteCommand, createSandboxSecretCommand()],
      clientConfigGeneratorAdapterMock,
      () => ({
        successfulDeployment: [clientConfigGenerationMock],
        successfulDeletion: [clientConfigDeletionMock],
      })
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    sandboxStartMock.mock.resetCalls();
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
    assert.ok(!sandboxStartMock.mock.calls[0].arguments[0].name);
  });

  void it('starts sandbox with user provided app name', async () => {
    await commandRunner.runCommand('sandbox --name user-app-name');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].name,
      'user-app-name'
    );
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox --help');
    assert.match(output, /--name/);
    assert.match(output, /--dir-to-watch/);
    assert.match(output, /--exclude/);
    assert.match(output, /--format/);
    assert.match(output, /--out-dir/);
  });

  void it('fails if invalid dir-to-watch is provided', async () => {
    const output = await commandRunner.runCommand(
      'sandbox --dir-to-watch nonExistentDir'
    );
    assert.match(output, /--dir-to-watch nonExistentDir does not exist/);
  });

  void it('fails if a file is provided in the --dir-to-watch flag', async (contextual) => {
    contextual.mock.method(fs, 'statSync', () => ({
      isDirectory: () => false,
    }));
    const output = await commandRunner.runCommand(
      'sandbox --dir-to-watch existentFile'
    );
    assert.match(
      output,
      /--dir-to-watch existentFile is not a valid directory/
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
    await assert.rejects(
      () => commandRunner.runCommand(`sandbox --profile ${sandboxProfile}`), // profile doesn't exist
      (err: TestCommandError) => {
        assert.match(
          err.error.message,
          /Failed to load aws credentials for profile/
        );
        return true;
      }
    );
    assert.equal(sandboxStartMock.mock.callCount(), 0);
    assert.strictEqual(process.env.AWS_PROFILE, sandboxProfile);
  });

  void it('starts sandbox with user provided valid AWS profile', async () => {
    // Append sandbox profile's credential data.
    const sandboxCredData = `[${sandboxProfile}]${EOL}aws_access_key_id = 33${EOL}aws_secret_access_key = 44${EOL}`;
    await fsAsync.appendFile(credFilePath, sandboxCredData, 'utf-8');

    const sandboxFactory = new SandboxSingletonFactory(() =>
      Promise.resolve('testBackendId')
    );
    sandbox = await sandboxFactory.getInstance();
    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [],
      clientConfigGeneratorAdapterMock,
      undefined
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    await commandRunner.runCommand(`sandbox --profile ${sandboxProfile}`);
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.strictEqual(process.env.AWS_PROFILE, sandboxProfile);
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import { format, printer } from '@aws-amplify/cli-core';
import { EventHandler, SandboxCommand } from './sandbox_command.js';
import { createSandboxCommand } from './sandbox_command_factory.js';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import {
  Sandbox,
  SandboxFunctionStreamingOptions,
  SandboxSingletonFactory,
} from '@aws-amplify/sandbox';
import { createSandboxSecretCommand } from './sandbox-secret/sandbox_secret_command_factory.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { AmplifyError } from '@aws-amplify/platform-core';
import { NoticesRenderer } from '../../notices/notices_renderer.js';
import { EOL } from 'node:os';
import * as portChecker from './port_checker.js';

// Mock isDevToolsRunning to always return false
mock.method(portChecker, 'isDevToolsRunning', () => Promise.resolve(false));

mock.method(fsp, 'mkdir', () => Promise.resolve());

// To check if client config already exists before creating an empty one.
mock.method(fs, 'existsSync', () => true);

const tryFindAndPrintApplicableNoticesMock = mock.fn();
const noticesRenderer = {
  tryFindAndPrintApplicableNotices: tryFindAndPrintApplicableNoticesMock,
} as unknown as NoticesRenderer;

void describe('sandbox command factory', () => {
  void it('instantiate a sandbox command correctly', () => {
    assert.ok(createSandboxCommand(noticesRenderer) instanceof SandboxCommand);
  });
});

void describe('sandbox command', () => {
  let commandRunner: TestCommandRunner;
  let sandbox: Sandbox;
  let sandboxStartMock = mock.fn<typeof sandbox.start>();
  const mockProfileResolver = mock.fn();

  const clientConfigGenerationMock = mock.fn<EventHandler>();
  const clientConfigDeletionMock = mock.fn<EventHandler>();

  const clientConfigGeneratorAdapterMock = {
    generateClientConfigToFile: clientConfigGenerationMock,
  } as unknown as ClientConfigGeneratorAdapter;

  const commandMiddleware = new CommandMiddleware(printer);
  const mockHandleProfile = mock.method(
    commandMiddleware,
    'ensureAwsCredentialAndRegion',
    () => null,
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
      mockProfileResolver,
      printer,
      format,
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
        resourceConfigChanged: [],
      }),
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
      'user-app-name',
    );
  });

  void it('throws AmplifyUserError if invalid identifier is provided', async () => {
    const invalidIdentifier = 'invalid@';
    await assert.rejects(
      () =>
        commandRunner.runCommand(`sandbox --identifier ${invalidIdentifier}`), // invalid identifier
      (err: TestCommandError) => {
        assert.ok(AmplifyError.isAmplifyError(err.error));
        assert.strictEqual(
          err.error.message,
          'Invalid --identifier provided: invalid@',
        );
        assert.strictEqual(err.error.name, 'InvalidCommandInputError');
        return true;
      },
    );
    assert.equal(sandboxStartMock.mock.callCount(), 0);
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('sandbox --help');
    assert.match(output, /--identifier/);
    assert.match(output, /--dir-to-watch/);
    assert.match(output, /--exclude/);
    assert.match(output, /--outputs-format/);
    assert.match(output, /--outputs-out-dir/);
    assert.match(output, /--once/);
    assert.match(output, /--stream-function-logs/);
    assert.match(output, /--logs-filter/);
    assert.match(output, /--logs-out-file/);
    assert.equal(mockHandleProfile.mock.callCount(), 0);
  });

  void it('dose not show logs streaming options in subcommand help output', async () => {
    const output = await commandRunner.runCommand('sandbox secret --help');
    assert.match(output, /Manage sandbox secret/);
    assert.doesNotMatch(output, /--stream-function-logs/);
    assert.doesNotMatch(output, /--logs-filter/);
    assert.doesNotMatch(output, /--logs-out-file/);
  });

  void it('dose not show once option in subcommand help output', async () => {
    const output = await commandRunner.runCommand('sandbox secret --help');
    assert.match(output, /Manage sandbox secret/);
    assert.doesNotMatch(output, /--once/);
  });

  void it('shows version should not call profile middleware', async () => {
    void commandRunner.runCommand('sandbox --version');
    assert.equal(mockHandleProfile.mock.callCount(), 0);
  });

  void it('fails if invalid dir-to-watch is provided', async () => {
    const dirToWatchError = new Error(
      '--dir-to-watch nonExistentDir does not exist',
    );
    mock.method(fsp, 'stat', () => Promise.reject(dirToWatchError));
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir-to-watch nonExistentDir'),
      (err: TestCommandError) => {
        assert.equal(err.error.message, dirToWatchError.message);
        return true;
      },
    );
  });

  void it('fails if a file is provided in the --dir-to-watch flag', async (contextual) => {
    const dirToWatchError = new Error(
      '--dir-to-watch existentFile is not a valid directory',
    );
    contextual.mock.method(fsp, 'stat', () => ({
      isDirectory: () => false,
    }));
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --dir-to-watch existentFile'),
      (err: TestCommandError) => {
        assert.equal(err.error.message, dirToWatchError.message);
        return true;
      },
    );
  });

  void it('Prints stopping sandbox and instructions to delete sandbox when users send ctrl+c', async (contextual) => {
    // Ensure isDevToolsRunning returns false for this test
    contextual.mock.method(portChecker, 'isDevToolsRunning', () => Promise.resolve(false));
    
    // Mock process and extract the sigint handler after calling the sandbox command
    const processSignal = contextual.mock.method(process, 'on', () => {
      /* no op */
    });
    const sandboxStartMock = contextual.mock.method(
      sandbox,
      'start',
      async () => Promise.resolve(),
    );

    const printerMock = contextual.mock.method(printer, 'print', () => {});

    await commandRunner.runCommand('sandbox');

    // Similar to the previous test's 0ms timeout. Without this tests in github action are failing
    // but working locally
    await new Promise((resolve) => setTimeout(resolve, 0));
    const sigIntHandlerFn = processSignal.mock.calls[0].arguments[1];
    if (sigIntHandlerFn) sigIntHandlerFn();

    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(printerMock.mock.callCount(), 1);
    assert.equal(
      printerMock.mock.calls[0].arguments[0],
      `${EOL}Stopping the sandbox process. To delete the sandbox, run ${format.normalizeAmpxCommand(
        'sandbox delete',
      )}`,
    );
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
      },
    );
    assert.equal(sandboxStartMock.mock.callCount(), 0);
    assert.equal(mockHandleProfile.mock.callCount(), 1);
    assert.equal(
      mockHandleProfile.mock.calls[0].arguments[0]?.profile,
      sandboxProfile,
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
      mockProfileResolver,
      printer,
      format,
    );
    sandbox = await sandboxFactory.getInstance();
    sandboxStartMock = mock.method(sandbox, 'start', () => Promise.resolve());

    const sandboxCommand = new SandboxCommand(
      sandboxFactory,
      [],
      clientConfigGeneratorAdapterMock,
      commandMiddleware,
      undefined,
    );
    const parser = yargs().command(sandboxCommand as unknown as CommandModule);
    commandRunner = new TestCommandRunner(parser);
    await commandRunner.runCommand(`sandbox --profile ${sandboxProfile}`);
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(
      mockHandleProfile.mock.calls[0].arguments[0]?.profile,
      sandboxProfile,
    );
  });

  void it('starts sandbox if a value containing "." is provided for config-out-dir', async () => {
    // this is a valid case to maintain consistency with behaviors of ampx generate graphql-client-code/forms
    await commandRunner.runCommand(
      'sandbox --outputs-out-dir existentFile.json',
    );
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].exclude,
      [path.join(process.cwd(), 'existentFile.json', 'amplify_outputs.json')],
    );
  });

  void it('starts sandbox with provided client config options as watch exclusions', async (contextual) => {
    contextual.mock.method(fsp, 'stat', () => ({
      isDirectory: () => true,
    }));
    await commandRunner.runCommand(
      'sandbox --outputs-out-dir existentDir --outputs-format dart',
    );
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].exclude,
      [path.join(process.cwd(), 'existentDir', 'amplify_outputs.dart')],
    );
  });

  void it('sandbox creates an empty client config file if one does not already exist for version 0', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => false);
    const writeFileMock = contextual.mock.method(fsp, 'writeFile', () => true);
    await commandRunner.runCommand('sandbox --outputs-version 0');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(writeFileMock.mock.calls[0].arguments[1], '{}');
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'amplifyconfiguration.json'),
    );
  });

  void it('sandbox creates an empty client config file if one does not already exist for version 1.4', async (contextual) => {
    contextual.mock.method(fs, 'existsSync', () => false);
    const writeFileMock = contextual.mock.method(fsp, 'writeFile', () => true);
    await commandRunner.runCommand('sandbox --outputs-version 1.4');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[1],
      `{\n  "version": "1.4"\n}`,
    );
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'amplify_outputs.json'),
    );
  });

  void it('starts sandbox with watchForChanges when --once flag is set', async () => {
    await commandRunner.runCommand('sandbox --once');
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.strictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].watchForChanges,
      false,
    );
  });

  void it('--once flag is mutually exclusive with dir-to-watch, exclude and stream-function-logs', async () => {
    assert.match(
      await commandRunner.runCommand(
        'sandbox --once --dir-to-watch nonExistentDir',
      ),
      /Arguments once and dir-to-watch are mutually exclusive/,
    );
    assert.match(
      await commandRunner.runCommand('sandbox --once --exclude test'),
      /Arguments once and exclude are mutually exclusive/,
    );
    assert.match(
      await commandRunner.runCommand('sandbox --once --stream-function-logs'),
      /Arguments once and stream-function-logs are mutually exclusive/,
    );
  });

  void it('fails if --logs-out-file is provided without enabling --stream-function-logs', async () => {
    assert.match(
      await commandRunner.runCommand('sandbox --logs-out-file someFile'),
      /Missing dependent arguments.* logs-out-file -> stream-function-logs/s,
    );
  });

  void it('starts sandbox with log watching options', async () => {
    await commandRunner.runCommand(
      'sandbox --stream-function-logs --logs-filter func1 --logs-filter func2 --logs-out-file someFile',
    );
    assert.equal(sandboxStartMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      sandboxStartMock.mock.calls[0].arguments[0].functionStreamingOptions,
      {
        enabled: true,
        logsFilters: ['func1', 'func2'],
        logsOutFile: 'someFile',
      } as SandboxFunctionStreamingOptions,
    );
  });
  
  void it('throws an error when DevTools is running', async (contextual) => {
    // Mock isDevToolsRunning to return true for this test
    contextual.mock.method(portChecker, 'isDevToolsRunning', () => Promise.resolve(true));
    
    // Mock printer.log to verify error message
    const printerLogMock = contextual.mock.method(printer, 'log');
    
    // Expect the command to throw an AmplifyUserError
    await assert.rejects(
      () => commandRunner.runCommand('sandbox'),
      (err: TestCommandError) => {
        assert.ok(err.error);
        assert.strictEqual(err.error.name, 'DevToolsRunningError');
        assert.strictEqual(
          err.error.message,
          'DevTools is currently running. Please start the sandbox through DevTools instead.'
        );
        return true;
      }
    );
    
    // Verify that sandbox.start was never called
    assert.equal(sandboxStartMock.mock.callCount(), 0);
    
    // Verify that the error was logged
    assert.ok(printerLogMock.mock.calls.some(call => 
      call.arguments[0] === 'DevTools is currently running'
    ));
  });
});

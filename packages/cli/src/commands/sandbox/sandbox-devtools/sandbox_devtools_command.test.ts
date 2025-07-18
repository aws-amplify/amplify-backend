import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';
import { format, printer } from '@aws-amplify/cli-core';
import { DevToolsLoggerFactory } from './services/devtools_logger_factory.js';
import { PortChecker } from '../port_checker.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { createServer } from 'node:http';

void describe('SandboxDevToolsCommand', () => {
  let command: SandboxDevToolsCommand;
  let originalHandler: () => Promise<void>;
  let mockSandboxBackendIdResolver: SandboxBackendIdResolver;
  let mockAwsClientProvider: {
    getS3Client: () => S3Client;
    getAmplifyClient: () => AmplifyClient;
    getCloudFormationClient: () => CloudFormationClient;
  };
  let mockPortChecker: PortChecker;
  let mockDevToolsLoggerFactory: DevToolsLoggerFactory;

  beforeEach(() => {
    mock.reset();

    // Mock DevToolsLoggerFactory
    mockDevToolsLoggerFactory = {
      createLogger: mock.fn(() => ({
        log: () => {},
        print: () => {},
        startSpinner: () => {},
        stopSpinner: () => {},
        updateSpinner: () => {},
        emitToClient: () => {},
      })),
    } as unknown as DevToolsLoggerFactory;

    // Mock printer methods
    mock.method(printer, 'print', () => {});
    mock.method(printer, 'log', () => {});
    mock.method(format, 'highlight', (text: string) => text);

    // Create mock for SandboxBackendIdResolver
    mockSandboxBackendIdResolver = {
      resolve: () =>
        Promise.resolve({
          name: 'test-backend',
          namespace: 'test',
          type: 'sandbox',
        }),
    } as unknown as SandboxBackendIdResolver;

    // Create mock for AWS client provider
    mockAwsClientProvider = {
      getS3Client: () => ({}) as S3Client,
      getAmplifyClient: () => ({}) as AmplifyClient,
      getCloudFormationClient: () => ({}) as CloudFormationClient,
    };

    // Mock PortChecker to prevent actual port operations
    mockPortChecker = new PortChecker();
    mock.method(mockPortChecker, 'isPortInUse', () => Promise.resolve(false));

    command = new SandboxDevToolsCommand(
      mockSandboxBackendIdResolver,
      mockAwsClientProvider,
      mockPortChecker,
      format,
      printer,
      mockDevToolsLoggerFactory,
    );
    originalHandler = command.handler;
  });

  afterEach(() => {
    // Restore original handler
    command.handler = originalHandler;
    mock.reset();
  });

  void describe('constructor', () => {
    void it('initializes with correct command and description', () => {
      assert.strictEqual(command.command, 'devtools');
      assert.strictEqual(
        command.describe,
        'Starts a development console for Amplify sandbox',
      );
    });
  });

  void describe('checkPortAvailability', () => {
    void it('does not throw when port is available', async (contextual) => {
      // Mock port checker to report port is available
      contextual.mock.method(mockPortChecker, 'isPortInUse', () =>
        Promise.resolve(false),
      );

      // This should not throw an error
      await command.checkPortAvailability(3333);

      // If we reach here, the test passes
      assert.ok(true);
    });

    void it('throws error when port is already in use', async (contextual) => {
      // Mock port checker to report port is in use
      contextual.mock.method(mockPortChecker, 'isPortInUse', () =>
        Promise.resolve(true),
      );

      // Mock printer.log to catch error message
      const logMock = contextual.mock.method(printer, 'log');

      // This should throw an error
      await assert.rejects(
        () => command.checkPortAvailability(3333),
        (error: Error) => {
          assert.match(error.message, /Port .* is required for DevTools/);
          return true;
        },
      );

      // Verify error was logged
      assert.strictEqual(logMock.mock.callCount(), 1);
      assert.match(
        logMock.mock.calls[0].arguments[0],
        /Port .* is already in use/,
      );
    });

    void it('handles port checker errors', async (contextual) => {
      // Mock port checker to throw an error
      contextual.mock.method(mockPortChecker, 'isPortInUse', () => {
        throw new Error('Port check failed');
      });

      // This should throw the same error
      await assert.rejects(
        () => command.checkPortAvailability(3333),
        (error: Error) => {
          assert.strictEqual(error.message, 'Port check failed');
          return true;
        },
      );
    });
  });

  void describe('startServer', () => {
    void it('starts the server and prints the start message', (contextual) => {
      const mockServer = {
        listen: contextual.mock.fn(),
      };

      const printMock = contextual.mock.method(printer, 'print');

      // Start the server
      command.startServer(
        mockServer as unknown as ReturnType<typeof createServer>,
        3333,
      );

      // Check that the server was started with the correct port
      assert.strictEqual(mockServer.listen.mock.callCount(), 1);
      assert.strictEqual(mockServer.listen.mock.calls[0].arguments[0], 3333);

      // Check that the start message was printed
      assert.strictEqual(printMock.mock.callCount(), 1);
      assert.match(
        printMock.mock.calls[0].arguments[0],
        /DevTools server started at http:\/\/localhost:3333/,
      );
    });
  });

  void describe('setupProcessHandlers', () => {
    void it('registers SIGINT and SIGTERM handlers', (contextual) => {
      const processOnceMock = contextual.mock.method(process, 'once');

      const mockShutdownService = {
        shutdown: contextual.mock.fn(() => Promise.resolve()),
      };

      command.setupProcessHandlers(mockShutdownService);

      assert.strictEqual(processOnceMock.mock.callCount(), 2);

      const sigintCall = processOnceMock.mock.calls.find(
        (call) => call.arguments[0] === 'SIGINT',
      );
      assert.ok(sigintCall, 'Should register SIGINT handler');

      // Check SIGTERM is registered
      // eslint-disable-next-line spellcheck/spell-checker
      const sigtermCall = processOnceMock.mock.calls.find(
        (call) => call.arguments[0] === 'SIGTERM',
      );
      // eslint-disable-next-line spellcheck/spell-checker
      assert.ok(sigtermCall, 'Should register SIGTERM handler');

      // Simulate SIGINT to verify shutdown is called
      if (sigintCall) {
        const sigintHandler = sigintCall.arguments[1];
        sigintHandler();
        // We can't easily assert async functions called inside an IIFE
      }
    });
  });

  void it('prints server start message when server starts', (contextual) => {
    const printMock = contextual.mock.method(printer, 'print');

    const mockServer = {
      listen: contextual.mock.fn(),
    };

    command.startServer(
      mockServer as unknown as ReturnType<typeof createServer>,
      3333,
    );

    assert.strictEqual(printMock.mock.callCount(), 1);
    assert.match(
      printMock.mock.calls[0].arguments[0],
      /DevTools server started at http:\/\/localhost:3333/,
    );
  });
});

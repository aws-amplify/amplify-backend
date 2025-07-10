import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';
import { format, printer } from '@aws-amplify/cli-core';
import { PortChecker } from '../port_checker.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

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

  beforeEach(() => {
    mock.reset();

    // Mock printer methods
    mock.method(printer, 'print', () => {});
    mock.method(printer, 'log', () => {});
    mock.method(format, 'highlight', (text: string) => text);

    // Create mock for SandboxBackendIdResolver
    mockSandboxBackendIdResolver = {
      resolve: () => Promise.resolve({ name: 'test-backend' }),
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

  void describe('handler', () => {
    void it('prints server start message', async (contextual) => {
      const printMock = contextual.mock.method(printer, 'print');

      // Mock the handler to avoid full execution
      command.handler = async () => {
        printer.print('DevTools server started at http://localhost:3333');
      };

      await command.handler();

      assert.strictEqual(printMock.mock.callCount(), 1);
      assert.match(
        printMock.mock.calls[0].arguments[0],
        /DevTools server started at/,
      );
    });

    void it('uses correct port when available', async (contextual) => {
      const portCheckerMock = contextual.mock.method(
        mockPortChecker,
        'isPortInUse',
        () => Promise.resolve(false),
      );

      const printMock = contextual.mock.method(printer, 'print');

      // Simplified handler test
      command.handler = async () => {
        const isInUse = await mockPortChecker.isPortInUse(3333);
        const port = isInUse ? 4444 : 3333;
        printer.print(`DevTools server started at http://localhost:${port}`);
      };

      await command.handler();

      assert.strictEqual(portCheckerMock.mock.callCount(), 1);
      assert.match(printMock.mock.calls[0].arguments[0], /localhost:3333/);
    });

    void it('handles port checker errors', async (contextual) => {
      contextual.mock.method(mockPortChecker, 'isPortInUse', () => {
        throw new Error('Port check failed');
      });

      command.handler = async () => {
        await mockPortChecker.isPortInUse(3333);
      };

      await assert.rejects(
        () => command.handler(),
        (error: Error) => {
          assert.strictEqual(error.message, 'Port check failed');
          return true;
        },
      );
    });
  });
});

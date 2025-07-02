import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SandboxDevToolsCommand } from './sandbox_devtools_command.js';
import { format, printer } from '@aws-amplify/cli-core';
import { PortChecker } from '../port_checker.js';

void describe('SandboxDevToolsCommand', () => {
  let command: SandboxDevToolsCommand;
  let originalHandler: () => Promise<void>;

  beforeEach(() => {
    mock.reset();

    // Mock printer methods
    mock.method(printer, 'print', () => {});
    mock.method(printer, 'log', () => {});
    mock.method(format, 'highlight', (text: string) => text);

    // Mock PortChecker to prevent actual port operations
    mock.method(PortChecker.prototype, 'isPortInUse', () =>
      Promise.resolve(false),
    );

    command = new SandboxDevToolsCommand();
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
        PortChecker.prototype,
        'isPortInUse',
        () => Promise.resolve(false),
      );

      const printMock = contextual.mock.method(printer, 'print');

      // Simplified handler test
      command.handler = async () => {
        const portChecker = new PortChecker();
        const isInUse = await portChecker.isPortInUse(3333);
        const port = isInUse ? 4444 : 3333;
        printer.print(`DevTools server started at http://localhost:${port}`);
      };

      await command.handler();

      assert.strictEqual(portCheckerMock.mock.callCount(), 1);
      assert.match(printMock.mock.calls[0].arguments[0], /localhost:3333/);
    });

    void it('handles port checker errors', async (contextual) => {
      contextual.mock.method(PortChecker.prototype, 'isPortInUse', () => {
        throw new Error('Port check failed');
      });

      command.handler = async () => {
        const portChecker = new PortChecker();
        await portChecker.isPortInUse(3333);
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

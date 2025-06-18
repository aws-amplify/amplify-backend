/* eslint-disable spellcheck/spell-checker */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { type Server, createServer } from 'node:http';
import {
  createFriendlyName,
  findAvailablePort,
} from './sandbox_devtools_command.js';
import { LogLevel, printer } from '@aws-amplify/cli-core';

void describe('createFriendlyName function', () => {
  void it('handles empty string by returning the original ID', () => {
    const emptyId = '';
    assert.strictEqual(createFriendlyName(emptyId), emptyId);
  });

  void it('handles IDs with only numeric characters', () => {
    const numericId = '12345';
    assert.strictEqual(createFriendlyName(numericId), numericId);
  });
});

void describe('findAvailablePort function', () => {
  void it('returns the first available port', async () => {
    // Create a mock server with a listen method that immediately succeeds
    let listenPort = 0;
    const serverMock = {
      listen: mock.fn((port, callback) => {
        listenPort = port;
        if (callback) callback();
        return serverMock;
      }),
      once: mock.fn(),
      close: mock.fn(),
    };

    const port = await findAvailablePort(
      serverMock as unknown as Server,
      3333,
      10,
    );
    assert.strictEqual(port, 3333);
    assert.strictEqual(serverMock.listen.mock.callCount(), 1);
    assert.strictEqual(listenPort, 3333);
  });

  void it('tries the next port if the current one is in use', async () => {
    // Track ports that were attempted
    const attemptedPorts: number[] = [];
    let callbackToCall: (() => void) | null = null;

    const serverMock = {
      listen: mock.fn((port, callback) => {
        attemptedPorts.push(port);
        // Store the callback for the second attempt
        if (attemptedPorts.length === 2 && callback) {
          callbackToCall = callback;
        }
        return serverMock;
      }),
      once: mock.fn((event, handler) => {
        if (event === 'error') {
          // Simulate EADDRINUSE for the first port
          if (attemptedPorts.length === 1) {
            handler({ code: 'EADDRINUSE' } as NodeJS.ErrnoException);
          }
          // For the second attempt, call the stored callback
          if (attemptedPorts.length === 2 && callbackToCall) {
            callbackToCall();
          }
        }
        return serverMock;
      }),
      close: mock.fn(),
    };

    const port = await findAvailablePort(
      serverMock as unknown as Server,
      3333,
      10,
    );
    assert.strictEqual(port, 3334);
    assert.strictEqual(serverMock.listen.mock.callCount(), 2);
    assert.strictEqual(attemptedPorts[0], 3333);
    assert.strictEqual(attemptedPorts[1], 3334);
  });

  void it('throws an error if no ports are available after max attempts', async () => {
    const serverMock = {
      listen: mock.fn(() => {
        // Don't call the callback, instead trigger the error handler
        return serverMock;
      }),
      once: mock.fn((event, handler) => {
        if (event === 'error') {
          // Always simulate EADDRINUSE
          handler({ code: 'EADDRINUSE' } as NodeJS.ErrnoException);
        }
        return serverMock;
      }),
      close: mock.fn(),
    };

    await assert.rejects(
      () =>
        findAvailablePort(
          serverMock as unknown as ReturnType<typeof createServer>,
          3333,
          3,
        ),
      (error) => {
        assert.strictEqual(
          (error as Error).message,
          'Could not find an available port after 3 attempts',
        );
        return true;
      },
    );

    assert.strictEqual(serverMock.listen.mock.callCount(), 3);
    assert.strictEqual(serverMock.close.mock.callCount(), 3);
  });

  void it('propagates other errors', async () => {
    const serverMock = {
      listen: mock.fn(() => {
        // Don't call the callback, instead trigger the error handler
        return serverMock;
      }),
      once: mock.fn((event, handler) => {
        if (event === 'error') {
          // Simulate a different error
          handler({
            code: 'OTHER_ERROR',
            message: 'Test error',
          } as NodeJS.ErrnoException);
        }
        return serverMock;
      }),
      close: mock.fn(),
    };

    const printerLogMock = mock.method(printer, 'log');

    await assert.rejects(
      () =>
        findAvailablePort(
          serverMock as unknown as ReturnType<typeof createServer>,
          3333,
          3,
        ),
      (error) => {
        assert.strictEqual(
          (error as NodeJS.ErrnoException).code,
          'OTHER_ERROR',
        );
        return true;
      },
    );

    // Verify error was logged
    let errorLogged = false;
    for (const call of printerLogMock.mock.calls) {
      if (
        call.arguments[0].includes('Failed to start server') &&
        call.arguments[1] === LogLevel.ERROR
      ) {
        errorLogged = true;
        break;
      }
    }
    assert.ok(errorLogged, 'Should log that server failed to start');
  });

  void it('tries multiple ports in sequence', async () => {
    // Track ports that were attempted
    const attemptedPorts: number[] = [];
    let callbackToCall: (() => void) | null = null;

    const serverMock = {
      listen: mock.fn((port, callback) => {
        attemptedPorts.push(port);
        // Store the callback for the fourth attempt
        if (attemptedPorts.length === 4 && callback) {
          callbackToCall = callback;
        }
        return serverMock;
      }),
      once: mock.fn((event, handler) => {
        if (event === 'error') {
          // Simulate EADDRINUSE for the first 3 ports
          if (attemptedPorts.length < 4) {
            handler({ code: 'EADDRINUSE' } as NodeJS.ErrnoException);
          }
          // For the 4th attempt, call the stored callback
          if (attemptedPorts.length === 4 && callbackToCall) {
            callbackToCall();
          }
        }
        return serverMock;
      }),
      close: mock.fn(),
    };

    const port = await findAvailablePort(
      serverMock as unknown as Server,
      3333,
      10,
    );
    assert.strictEqual(port, 3336);
    assert.strictEqual(serverMock.listen.mock.callCount(), 4);
    assert.strictEqual(attemptedPorts[0], 3333);
    assert.strictEqual(attemptedPorts[1], 3334);
    assert.strictEqual(attemptedPorts[2], 3335);
    assert.strictEqual(attemptedPorts[3], 3336);
  });
});
